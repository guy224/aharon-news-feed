"use client";

import { useMemo } from "react";
import {
  Clock,
  AlertTriangle,
  Image as ImageIcon,
  Shield,
  Siren,
  Landmark,
  Globe,
  Scale,
  Newspaper,
  Share2,
} from "lucide-react";
import { motion } from "framer-motion";
import type { NewsFeedItem, NewsCategory } from "@/lib/types";

// ── Relative Time Formatter ────────────────────────────

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 30) return "עכשיו";
  if (diffSeconds < 60) return `לפני ${diffSeconds} שניות`;
  if (diffMinutes === 1) return "לפני דקה";
  if (diffMinutes < 60) return `לפני ${diffMinutes} דקות`;
  if (diffHours === 1) return "לפני שעה";
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays === 1) return "אתמול";
  if (diffDays < 7) return `לפני ${diffDays} ימים`;
  return date.toLocaleDateString("he-IL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatFullTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("he-IL", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Category Config ────────────────────────────────────

const CATEGORY_MAP: Record<NewsCategory, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  "ביטחוני": { icon: Shield,    color: "text-red-400" },
  "אזעקות":  { icon: Siren,     color: "text-rose-300" },
  "פוליטי":  { icon: Landmark,  color: "text-blue-400" },
  "מדיני":   { icon: Globe,     color: "text-purple-400" },
  "פלילי":   { icon: Scale,     color: "text-amber-400" },
  "כללי":    { icon: Newspaper, color: "text-slate-400" },
};

// ── Urgency card styling ──────────────────────────────

function getUrgencyStyles(score: number | null) {
  const s = score || 1;
  if (s >= 5) return {
    border: "rgba(239,68,68,0.4)",
    glow: "0 0 25px rgba(239,68,68,0.3)",
    bg: "rgba(127,29,29,0.1)",
    titleClass: "text-white/95", // Kept simple per request
    urgent: true,
  };
  if (s >= 4) return {
    border: "rgba(239,68,68,0.3)", // border-red-500/30 requested
    glow: "0 0 15px rgba(239,68,68,0.2)",
    bg: "rgba(249,115,22,0.05)",
    titleClass: "text-white/95",
    urgent: true,
  };
  return {
    border: "rgba(255,255,255,0.08)",
    glow: "0 25px 50px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
    bg: "rgba(255,255,255,0.04)",
    titleClass: "text-white/95",
    urgent: false,
  };
}

// ── Component ──────────────────────────────────────────

interface FeedCardProps {
  item: NewsFeedItem;
  isNew?: boolean;
  index?: number;
}

export default function FeedCard({ item, isNew = false, index = 0 }: FeedCardProps) {
  const relativeTime = useMemo(() => formatRelativeTime(item.timestamp), [item.timestamp]);
  const fullTime     = useMemo(() => formatFullTime(item.timestamp), [item.timestamp]);
  const urgency      = useMemo(() => getUrgencyStyles(item.urgency_score), [item.urgency_score]);

  const categoryConfig = item.category ? CATEGORY_MAP[item.category] ?? CATEGORY_MAP["כללי"] : null;
  const CategoryIcon   = categoryConfig?.icon;
  const isHighUrgency  = (item.urgency_score || 1) >= 4;

  const handleShare = async () => {
    const shareData = {
      title: item.ai_title || "עדכון חדשות - אהרון ידיעות",
      text: item.ai_title ? `${item.ai_title}\n\n` : "",
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); }
      catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareData.text}${shareData.url}`);
      alert("הקישור הועתק ללוח!");
    }
  };

  let fallbackTitle = "";
  if (!item.ai_title && item.content) {
    const plainText = item.content.replace(/<[^>]*>?/gm, "").trim();
    const words = plainText.split(/\s+/);
    fallbackTitle = words.slice(0, 10).join(" ") + (words.length > 10 ? "..." : "");
  }
  const displayTitle = item.ai_title || fallbackTitle;

  return (
    <motion.article
      id={`feed-card-${item.telegram_message_id}`}
      layout
      layoutId={`card-${item.id}`}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], delay: isNew ? 0 : index * 0.04 }}
      whileHover={{ scale: 1.015, y: -2, transition: { type: "spring", stiffness: 400, damping: 28 } }}
      className="cursor-default"
      style={{ animationFillMode: "both" }}
    >
      <div
        className="flex flex-col rounded-[2rem] backdrop-blur-2xl transition-shadow duration-300 p-4 sm:p-5"
        style={{
          background: urgency.bg,
          border: `1px solid ${urgency.border}`,
          boxShadow: urgency.urgent
            ? `${urgency.glow}, 0 25px 50px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)`
            : urgency.glow,
        }}
      >
        {/* ── Header: Category, Share ─────────── */}
        <div className="mb-2 flex items-start justify-between gap-2">
          {categoryConfig && CategoryIcon ? (
            <div className="flex items-center gap-2">
              <span className="bg-white/10 backdrop-blur-md border border-white/10 text-[10px] px-2 py-0.5 rounded-full text-slate-300 uppercase tracking-widest inline-flex items-center gap-1.5">
                <CategoryIcon className="h-2.5 w-2.5" />
                {item.category}
              </span>
              {/* Urgency dots */}
              {item.urgency_score && item.urgency_score > 1 && (
                <div className="flex items-center gap-[3px]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1 w-1 rounded-full"
                      style={{
                        background: i < (item.urgency_score ?? 1)
                          ? (item.urgency_score ?? 1) >= 4 ? "rgb(239,68,68)"
                          : (item.urgency_score ?? 1) >= 3 ? "rgb(234,179,8)"
                          : "rgba(255,255,255,0.4)"
                          : "rgba(255,255,255,0.1)",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : <div />}
          <button
            onClick={handleShare}
            aria-label="שתף"
            className="flex-shrink-0 rounded-full p-2 text-white/30 transition-all hover:bg-white/10 hover:text-white/70 focus:outline-none"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>

        {/* ── AI Title (The Headline) ─────────── */}
        {displayTitle && (
          <h2 className="mb-3 text-xl md:text-2xl font-bold text-white/95 tracking-tight leading-tight">
            {displayTitle}
          </h2>
        )}

        {/* ── Media ───────────────────────────────────── */}
        {item.media_url && (
          <div className="relative mb-3 flex items-center justify-center overflow-hidden rounded-2xl bg-black/40">
            {item.media_type === "video" || item.media_url.endsWith(".mp4") ? (
              <video
                src={item.media_url}
                controls
                preload="metadata"
                className="max-h-80 w-full object-contain sm:max-h-[440px]"
              />
            ) : (
              <>
                <img
                  src={item.media_url}
                  alt="תמונה מצורפת"
                  loading="lazy"
                  className="max-h-80 w-full object-contain sm:max-h-[440px]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div className="hidden h-40 w-full items-center justify-center">
                  <ImageIcon className="h-7 w-7 text-white/20" />
                </div>
              </>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>
        )}

        {/* ── Content ─────────────────────────────────── */}
        {item.content && (
          <div
            className="feed-content text-slate-400 text-sm md:text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        )}

        {/* ── Timestamp ───────────────────────────────── */}
        <div className="mt-2 flex justify-end">
          <time
            dateTime={item.timestamp}
            title={fullTime}
            className="text-[10px] text-slate-500"
          >
            {relativeTime}
          </time>
        </div>
      </div>
    </motion.article>
  );
}
