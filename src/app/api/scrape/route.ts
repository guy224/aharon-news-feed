import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { ScrapedMessage, ScrapeResponse, AiAnalysis } from "@/lib/types";

// ── Urgent keywords (fallback when Gemini is unavailable) ──
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
 * Format: "channelname/12345" → 12345
 */
function parseMessageId(dataPost: string | undefined): number | null {
  if (!dataPost) return null;
  const parts = dataPost.split("/");
  const id = parseInt(parts[parts.length - 1], 10);
  return isNaN(id) ? null : id;
}

// ── Gemini AI Analysis ─────────────────────────────────────

const GEMINI_PROMPT = `אתה עורך חדשות ישראלי מומחה. עבור כל הודעת חדשות, נתח אותה והחזר JSON עם השדות הבאים:

1. "ai_title": כותרת קצרה ופתיחנית בעברית, 4-6 מילים, בסגנון של פלאש חדשותי. אל תשתמש בגרשיים בתוך הכותרת.
2. "category": אחת מהקטגוריות הבאות בלבד: "ביטחוני", "אזעקות", "פוליטי", "מדיני", "פלילי", "כללי"
3. "urgency_score": מספר בין 1 ל-5:
   - 5 = אזעקת צבע אדום פעילה, פיגוע, ירי רקטות
   - 4 = אירוע ביטחוני משמעותי, חדירה, תקיפה
   - 3 = עדכון ביטחוני חשוב, החלטה מדינית דחופה
   - 2 = חדשות שוטפות חשובות
   - 1 = עדכון כללי, מידע שגרתי

החזר אך ורק JSON תקין, ללא טקסט נוסף.`;

/**
 * Analyze a single message with Gemini AI
 */
async function analyzeWithGemini(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  plainText: string
): Promise<AiAnalysis | null> {
  try {
    const result = await model.generateContent(
      `${GEMINI_PROMPT}\n\nהודעה לניתוח:\n${plainText}`
    );
    const responseText = result.response.text();

    const parsed = JSON.parse(responseText);

    // Validate and clamp values
    const validCategories = ["ביטחוני", "אזעקות", "פוליטי", "מדיני", "פלילי", "כללי"];
    const category = validCategories.includes(parsed.category) ? parsed.category : "כללי";
    const urgencyScore = Math.min(5, Math.max(1, Math.round(Number(parsed.urgency_score) || 1)));

    return {
      ai_title: parsed.ai_title || null,
      category,
      urgency_score: urgencyScore,
    };
  } catch (err) {
    console.error("Gemini analysis error:", err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Batch-analyze messages with Gemini, processing concurrently with a limit
 */
async function batchAnalyze(
  messages: { id: number; text: string }[],
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>
): Promise<Map<number, AiAnalysis>> {
  const results = new Map<number, AiAnalysis>();

  // Process in batches of 5 to respect rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (msg) => {
      const analysis = await analyzeWithGemini(model, msg.text);
      if (analysis) {
        results.set(msg.id, analysis);
      }
    });
    await Promise.all(promises);

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < messages.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  return results;
}

// ── Main Route Handler ─────────────────────────────────────

/**
 * GET /api/scrape
 *
 * Fetches the latest messages from the configured Telegram channel,
 * parses them with Cheerio, analyzes with Gemini AI, and upserts into Supabase.
 *
 * Protected by CRON_SECRET / SCRAPER_SECRET_TOKEN — pass as Bearer token.
 */
export async function GET(request: NextRequest) {
  // ── Auth Check ──────────────────────────────────────────
  // Two auth methods for external cron services:
  // 1. Header:  Authorization: Bearer <SCRAPER_SECRET_TOKEN>
  // 2. Query:   /api/scrape?token=<SCRAPER_SECRET_TOKEN>
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
  const geminiApiKey = process.env.GEMINI_API_KEY;

  try {
    // ── Fetch Telegram HTML ──────────────────────────────
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

    // ── Parse Messages ───────────────────────────────────
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
          // AI fields will be filled after Gemini analysis
          category: null,
          ai_title: null,
          urgency_score: 1,
        });

        // Collect plain text for AI analysis
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

    // ── Gemini AI Analysis ───────────────────────────────
    let aiResults = new Map<number, AiAnalysis>();

    if (geminiApiKey && plainTexts.length > 0) {
      try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.3,
            maxOutputTokens: 256,
          },
        });

        aiResults = await batchAnalyze(plainTexts, model);
        console.log(`Gemini analyzed ${aiResults.size}/${plainTexts.length} messages`);
      } catch (err) {
        errors.push(`Gemini initialization error: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (!geminiApiKey) {
      errors.push("GEMINI_API_KEY not configured — skipping AI analysis");
    }

    // ── Merge AI results into messages ───────────────────
    for (const msg of messages) {
      const ai = aiResults.get(msg.telegram_message_id);
      if (ai) {
        msg.ai_title = ai.ai_title;
        msg.category = ai.category;
        msg.urgency_score = ai.urgency_score;
        // Override is_urgent based on urgency_score
        if (ai.urgency_score >= 4) {
          msg.is_urgent = true;
        }
      }
    }

    // ── Upsert to Supabase ───────────────────────────────
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
