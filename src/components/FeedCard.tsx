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

  return date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ── Category Config ────────────────────────────────────

interface CategoryConfig {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  text: string;
  border: string;
}

const CATEGORY_MAP: Record<NewsCategory, CategoryConfig> = {
  "ביטחוני": {
    icon: Shield,
    bg: "bg-red-500/15",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  "אזעקות": {
    icon: Siren,
    bg: "bg-rose-500/20",
    text: "text-rose-300",
    border: "border-rose-500/40",
  },
  "פוליטי": {
    icon: Landmark,
    bg: "bg-blue-500/15",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  "מדיני": {
    icon: Globe,
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  "פלילי": {
    icon: Scale,
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  "כללי": {
    icon: Newspaper,
    bg: "bg-slate-500/15",
    text: "text-slate-400",
    border: "border-slate-500/30",
  },
};

// ── Urgency Styles ─────────────────────────────────────

function getUrgencyStyles(score: number | null) {
  const s = score || 1;
  if (s >= 5)
    return {
      card: "border-red-500/60 bg-red-950/40 shadow-[0_0_15px_rgba(239,68,68,0.15)] animate-pulse-urgent",
      dot: "border-red-400 bg-red-500 shadow-md shadow-red-500/50",
      titleColor: "bg-gradient-to-r from-red-200 to-rose-400 bg-clip-text text-transparent drop-shadow-sm",
    };
  if (s >= 4)
    return {
      card: "border-orange-500/40 bg-orange-950/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]",
      dot: "border-orange-400 bg-orange-500 shadow-md shadow-orange-500/40",
      titleColor: "bg-gradient-to-r from-orange-100 to-amber-400 bg-clip-text text-transparent drop-shadow-sm",
    };
  if (s >= 3)
    return {
      card: "border-white/10 bg-slate-800/60",
      dot: "border-yellow-500 bg-yellow-500",
      titleColor: "text-slate-50",
    };
  return {
    card: "border-white/10 bg-slate-800/40",
    dot: "border-slate-500 bg-slate-600",
    titleColor: "text-slate-100",
  };
}

// ── Component ──────────────────────────────────────────

interface FeedCardProps {
  item: NewsFeedItem;
  isNew?: boolean;
  index?: number;
}

/**
 * FeedCard — Individual news item card with AI-generated title, category badge, and urgency styling
 */
export default function FeedCard({ item, isNew = false, index = 0 }: FeedCardProps) {
  const relativeTime = useMemo(() => formatRelativeTime(item.timestamp), [item.timestamp]);
  const fullTime = useMemo(() => formatFullTime(item.timestamp), [item.timestamp]);

  const urgency = useMemo(() => getUrgencyStyles(item.urgency_score), [item.urgency_score]);
  const categoryConfig = item.category ? CATEGORY_MAP[item.category] || CATEGORY_MAP["כללי"] : null;
  const CategoryIcon = categoryConfig?.icon;

  const isHighUrgency = (item.urgency_score || 1) >= 4;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.ai_title || "עדכון חדשות - אהרון ידיעות",
          text: item.ai_title ? `${item.ai_title}\n\n` : "",
          url: window.location.href,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(`${item.ai_title || ""}\n${window.location.href}`);
      alert("הקישור הועתק ללוח!");
    }
  };

  return (
    <motion.article
      id={`feed-card-${item.telegram_message_id}`}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative pr-8"
    >
      {/* Timeline dot */}
      <div className="absolute right-0 top-4 z-10">
        <div className={`h-[10px] w-[10px] rounded-full border-2 ${urgency.dot}`} />
      </div>

      {/* Card */}
      <div
        className={`
          group overflow-hidden rounded-xl border backdrop-blur-md
          transition-all duration-300 hover:border-slate-500/40
          ${urgency.card}
        `}
      >
        {/* ── Urgent Banner ─────────────────────────────── */}
        {isHighUrgency && (
          <div
            className={`flex items-center gap-2 border-b px-4 py-2 ${
              (item.urgency_score || 1) >= 5
                ? "border-red-500/30 bg-red-500/15"
                : "border-orange-500/20 bg-orange-500/10"
            }`}
          >
            <AlertTriangle
              className={`h-4 w-4 ${
                (item.urgency_score || 1) >= 5 ? "text-red-400" : "text-orange-400"
              }`}
            />
            <span
              className={`text-xs font-bold tracking-wide ${
                (item.urgency_score || 1) >= 5 ? "text-red-400" : "text-orange-400"
              }`}
            >
              {(item.urgency_score || 1) >= 5 ? "עדכון דחוף ביותר" : "עדכון חשוב"}
            </span>
            {(item.urgency_score || 1) >= 5 && (
              <span className="mr-auto h-2 w-2 animate-pulse-live rounded-full bg-red-500" />
            )}
          </div>
        )}

        {/* ── Media ─────────────────────────────────────── */}
        {item.media_url && (
          <div className="relative flex items-center justify-center overflow-hidden bg-black/40">
            {item.media_type === "video" || item.media_url.endsWith(".mp4") ? (
              <video
                src={item.media_url}
                controls
                preload="metadata"
                className="max-h-96 w-full object-contain sm:max-h-[500px]"
              />
            ) : (
              <>
                <img
                  src={item.media_url}
                  alt="תמונה מצורפת"
                  loading="lazy"
                  className="max-h-96 w-full object-contain sm:max-h-[500px]"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div className="hidden h-48 w-full items-center justify-center bg-slate-800/50 sm:h-56">
                  <ImageIcon className="h-8 w-8 text-slate-600" />
                </div>
              </>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
          </div>
        )}

        {/* ── Content ───────────────────────────────────── */}
        <div className="space-y-3 p-4">
          {/* AI Title & Share Button */}
          <div className="flex items-start justify-between gap-3">
            {item.ai_title && (
              <h2 className={`text-lg font-extrabold leading-snug tracking-wide sm:text-xl ${urgency.titleColor}`}>
                {item.ai_title}
              </h2>
            )}
            <button
              onClick={handleShare}
              className="flex-shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-200"
              aria-label="שתף"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>

          {/* Category Badge + Urgency Score */}
          {categoryConfig && CategoryIcon && (
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryConfig.bg} ${categoryConfig.text} ${categoryConfig.border}`}
              >
                <CategoryIcon className="h-3 w-3" />
                {item.category}
              </span>

              {/* Urgency score dots */}
              {item.urgency_score && item.urgency_score > 1 && (
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${
                        i < (item.urgency_score || 1)
                          ? (item.urgency_score || 1) >= 4
                            ? "bg-red-400"
                            : (item.urgency_score || 1) >= 3
                            ? "bg-yellow-400"
                            : "bg-slate-400"
                          : "bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Message body */}
          {item.content && (
            <div
              className="feed-content text-sm leading-relaxed text-slate-300"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 pt-1">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <time
              dateTime={item.timestamp}
              title={fullTime}
              className="text-xs text-slate-500 transition-colors hover:text-slate-400"
            >
              {relativeTime}
            </time>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
