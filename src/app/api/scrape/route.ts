import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import Groq from "groq-sdk";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { ScrapedMessage, ScrapeResponse, AiAnalysis, NewsCategory } from "@/lib/types";

// ── Urgent keywords (fallback when AI is unavailable) ──
const URGENT_KEYWORDS = [
  "צבע אדום",
  "אזעקה",
  "ירי רקטות",
  "חדירת מחבלים",
  "פיגוע",
  "אירוע חמור",
];

function isUrgentContent(content: string | null): boolean {
  if (!content) return false;
  return URGENT_KEYWORDS.some((keyword) => content.includes(keyword));
}

/**
 * Extract image URL from Telegram photo element's inline style
 */
function extractImageUrl(styleAttr: string | undefined): string | null {
  if (!styleAttr) return null;
  const match = styleAttr.match(/background-image:\s*url\(['"]?(.*?)['"]?\)/);
  return match ? match[1] : null;
}

/**
 * Parse Telegram message ID from data-post attribute
 */
function parseMessageId(dataPost: string | undefined): number | null {
  if (!dataPost) return null;
  const parts = dataPost.split("/");
  const id = parseInt(parts[parts.length - 1], 10);
  return isNaN(id) ? null : id;
}

// ── Groq AI Analysis ─────────────────────────────────────

const GROQ_SYSTEM_PROMPT = `You are an expert Israeli news editor. 
Analyze the news message and return a JSON object with these EXACT fields:
1. "ai_title": A short, punchy Hebrew headline (4-6 words) for the news flash.
2. "category": Strictly one of these values: "ביטחוני", "אזעקות", "פוליטי", "מדיני", "פלילי", "כללי".
3. "urgency_score": A number 1 to 5 (5 is a rocket alert or major attack, 1 is routine news).

CRITICAL: Return ONLY valid JSON. No other text.`;

/**
 * Analyze a single message with Groq AI (Llama 3)
 */
async function analyzeWithGroq(
  groq: Groq,
  plainText: string
): Promise<AiAnalysis | null> {
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: GROQ_SYSTEM_PROMPT },
        { role: "user", content: `Analyze this news message: ${plainText}` }
      ],
      model: "llama3-70b-8192",
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 256,
    });

    const responseText = chatCompletion.choices[0]?.message?.content;
    if (!responseText) return null;

    const parsed = JSON.parse(responseText);

    // Validate and clamp values
    const validCategories: NewsCategory[] = ["ביטחוני", "אזעקות", "פוליטי", "מדיני", "פלילי", "כללי"];
    const category = validCategories.includes(parsed.category) ? parsed.category : "כללי";
    const urgencyScore = Math.min(5, Math.max(1, Math.round(Number(parsed.urgency_score) || 1)));

    return {
      ai_title: parsed.ai_title || "עדכון חדשות",
      category,
      urgency_score: urgencyScore,
    };
  } catch (err) {
    console.error("Groq analysis error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Batch-analyze messages with Groq
 */
async function batchAnalyze(
  messages: { id: number; text: string }[],
  groq: Groq
): Promise<Map<number, AiAnalysis>> {
  const results = new Map<number, AiAnalysis>();

  // Process in batches of 3 to respect rate limits (Groq is fast but has TPM limits)
  const BATCH_SIZE = 3;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (msg) => {
      const analysis = await analyzeWithGroq(groq, msg.text);
      if (analysis) {
        results.set(msg.id, analysis);
      }
    });
    await Promise.all(promises);

    // Small delay between batches
    if (i + BATCH_SIZE < messages.length) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return results;
}

// ── Main Route Handler ─────────────────────────────────────

export async function GET(request: NextRequest) {
  // ── Auth Check ──────────────────────────────────────────
  const authHeader = request.headers.get("authorization");
  const queryToken = request.nextUrl.searchParams.get("token");
  const scraperSecret = process.env.SCRAPER_SECRET_TOKEN;

  if (!scraperSecret) {
    return NextResponse.json(
      { success: false, message: "SCRAPER_SECRET_TOKEN not configured" } as ScrapeResponse,
      { status: 500 }
    );
  }

  const isAuthorized =
    authHeader === `Bearer ${scraperSecret}` ||
    queryToken === scraperSecret;

  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" } as ScrapeResponse,
      { status: 401 }
    );
  }

  // ── Config ──────────────────────────────────────────────
  const channelUsername = process.env.TELEGRAM_CHANNEL_USERNAME;
  if (!channelUsername) {
    return NextResponse.json(
      { success: false, message: "TELEGRAM_CHANNEL_USERNAME not configured" } as ScrapeResponse,
      { status: 500 }
    );
  }

  const telegramUrl = `https://t.me/s/${channelUsername}`;
  const groqApiKey = process.env.GROQ_API_KEY;

  try {
    const response = await fetch(telegramUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9,he;q=0.8",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Failed to fetch Telegram page: ${response.status} ${response.statusText}`,
        } as ScrapeResponse,
        { status: 502 }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const messages: ScrapedMessage[] = [];
    const plainTexts: { id: number; text: string }[] = [];
    const errors: string[] = [];

    $(".tgme_widget_message_wrap").each((_index, element) => {
      try {
        const $msg = $(element);
        const $messageDiv = $msg.find(".tgme_widget_message");
        const dataPost = $messageDiv.attr("data-post");
        const messageId = parseMessageId(dataPost);

        if (!messageId) {
          errors.push(`Skipped message: could not parse ID from data-post="${dataPost}"`);
          return;
        }

        const content = $msg.find(".tgme_widget_message_text").html() || null;
        const plainText = $msg.find(".tgme_widget_message_text").text() || null;

        const timeEl = $msg.find(".tgme_widget_message_date time");
        const datetime = timeEl.attr("datetime");
        const timestamp = datetime || new Date().toISOString();

        let mediaUrl: string | null = null;
        const photoWrap = $msg.find(".tgme_widget_message_photo_wrap");
        if (photoWrap.length) {
          mediaUrl = extractImageUrl(photoWrap.attr("style"));
        }
        if (!mediaUrl) {
          const videoThumb = $msg.find(".tgme_widget_message_video_thumb");
          if (videoThumb.length) {
            mediaUrl = extractImageUrl(videoThumb.attr("style"));
          }
        }
        if (!mediaUrl) {
          const imgEl = $msg.find(".tgme_widget_message_photo img");
          if (imgEl.length) {
            mediaUrl = imgEl.attr("src") || null;
          }
        }

        messages.push({
          telegram_message_id: messageId,
          content,
          timestamp,
          media_url: mediaUrl,
          is_urgent: isUrgentContent(plainText),
          category: null,
          ai_title: null,
          urgency_score: 1,
        });

        if (plainText && plainText.trim().length > 10) {
          plainTexts.push({ id: messageId, text: plainText.trim() });
        }
      } catch (err) {
        errors.push(`Error parsing message: ${err instanceof Error ? err.message : String(err)}`);
      }
    });

    if (messages.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: "No messages found on the page",
          count: 0,
          errors: errors.length > 0 ? errors : undefined,
        } as ScrapeResponse,
        { status: 200 }
      );
    }

    // ── Groq AI Analysis ─────────────────────────────────
    let aiResults = new Map<number, AiAnalysis>();

    if (groqApiKey && plainTexts.length > 0) {
      try {
        const groq = new Groq({ apiKey: groqApiKey });
        aiResults = await batchAnalyze(plainTexts, groq);
        console.log(`Groq analyzed ${aiResults.size}/${plainTexts.length} messages`);
      } catch (err) {
        errors.push(`Groq batch analysis error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (!groqApiKey) {
      errors.push("GROQ_API_KEY not configured — skipping AI analysis");
    }

    for (const msg of messages) {
      const ai = aiResults.get(msg.telegram_message_id);
      if (ai) {
        msg.ai_title = ai.ai_title;
        msg.category = ai.category;
        msg.urgency_score = ai.urgency_score;
        if (ai.urgency_score >= 4) {
          msg.is_urgent = true;
        }
      }
    }

    const supabase = createServerSupabaseClient();
    const { error: upsertError } = await supabase
      .from("news_feed")
      .upsert(
        messages.map((msg) => ({
          telegram_message_id: msg.telegram_message_id,
          content: msg.content,
          timestamp: msg.timestamp,
          media_url: msg.media_url,
          is_urgent: msg.is_urgent,
          category: msg.category,
          ai_title: msg.ai_title,
          urgency_score: msg.urgency_score,
        })),
        {
          onConflict: "telegram_message_id",
          ignoreDuplicates: false,
        }
      );

    if (upsertError) {
      return NextResponse.json(
        {
          success: false,
          message: `Supabase upsert error: ${upsertError.message}`,
          errors: [upsertError.details, upsertError.hint].filter(Boolean) as string[],
        } as ScrapeResponse,
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully processed ${messages.length} messages (${aiResults.size} AI-analyzed)`,
        count: messages.length,
        errors: errors.length > 0 ? errors : undefined,
      } as ScrapeResponse,
      { status: 200 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: `Scraper error: ${err instanceof Error ? err.message : String(err)}`,
      } as ScrapeResponse,
      { status: 500 }
    );
  }
}
