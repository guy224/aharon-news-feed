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
    border: "rgba(239,68,68,0.45)",
    glow: "0 0 0 1px rgba(239,68,68,0.3), 0 0 28px rgba(239,68,68,0.14)",
    bg: "rgba(127,29,29,0.22)",
    titleClass: "bg-gradient-to-r from-red-200 via-rose-300 to-red-400 bg-clip-text text-transparent",
    dotClass: "bg-red-500 shadow-md shadow-red-500/50",
    urgent: true,
  };
  if (s >= 4) return {
    border: "rgba(249,115,22,0.35)",
    glow: "0 0 0 1px rgba(249,115,22,0.2), 0 0 20px rgba(249,115,22,0.1)",
    bg: "rgba(124,45,18,0.18)",
    titleClass: "bg-gradient-to-r from-orange-100 to-amber-400 bg-clip-text text-transparent",
    dotClass: "bg-orange-500 shadow-md shadow-orange-500/40",
    urgent: false,
  };
  return {
    border: "rgba(255,255,255,0.08)",
    glow: "0 25px 50px -12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
    bg: "rgba(255,255,255,0.04)",
    titleClass: "text-white/95",
    dotClass: "bg-white/25",
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
        {/* ── Urgency Banner ──────────────────────────── */}
        {isHighUrgency && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl mb-4"
            style={{
              border: `1px solid ${urgency.border}`,
              background: (item.urgency_score || 1) >= 5
                ? "rgba(239,68,68,0.12)"
                : "rgba(249,115,22,0.08)",
            }}
          >
            <AlertTriangle
              className={`h-3.5 w-3.5 ${(item.urgency_score||1) >= 5 ? "text-red-400" : "text-orange-400"}`}
            />
            <span
              className={`text-xs font-bold tracking-widest uppercase ${
                (item.urgency_score||1) >= 5 ? "text-red-400" : "text-orange-400"
              }`}
            >
              {(item.urgency_score||1) >= 5 ? "⚡ עדכון דחוף" : "עדכון חשוב"}
            </span>
            {(item.urgency_score||1) >= 5 && (
              <span className="mr-auto h-2 w-2 animate-pulse-live rounded-full bg-red-500 shadow-lg shadow-red-500/60" />
            )}
          </div>
        )}

        {/* ── Media ───────────────────────────────────── */}
        {item.media_url && (
          <div className="relative mb-4 flex items-center justify-center overflow-hidden rounded-2xl bg-black/40">
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
            {/* Vignette */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          </div>
        )}

        {/* ── Content ─────────────────────────────────── */}
        <div className="flex flex-col">
          {/* AI Title & Share */}
          <div className="mb-4 flex items-start justify-between gap-4">
            {item.ai_title && (
              <h2 className={`text-xl font-black leading-tight tracking-tight sm:text-2xl ${urgency.titleClass}`}>
                {item.ai_title}
              </h2>
            )}
            <button
              onClick={handleShare}
              aria-label="שתף"
              className="flex-shrink-0 rounded-full p-2 text-white/30 transition-all hover:bg-white/8 hover:text-white/70"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>

          {/* Category badge + Urgency dots */}
          {categoryConfig && CategoryIcon && (
            <div className="mb-4 flex items-center gap-2.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-medium uppercase tracking-widest ${categoryConfig.color}`}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
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
          )}

          {/* Message body */}
          {item.content && (
            <div
              className="feed-content mb-4 text-sm leading-relaxed text-slate-300 md:text-base"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <Clock className="h-3 w-3 text-white/25" />
            <time
              dateTime={item.timestamp}
              title={fullTime}
              className="text-[11px] font-medium uppercase tracking-widest text-white/30 transition-colors hover:text-white/50"
            >
              {relativeTime}
            </time>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
