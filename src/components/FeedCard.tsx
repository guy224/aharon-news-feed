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
  Flame,
  TrendingUp,
  Bookmark,
} from "lucide-react";
import { motion } from "framer-motion";
import type { NewsFeedItem, NewsCategory } from "@/lib/types";
import { useUserPreferences } from "@/contexts/UserPreferencesContext";

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

// Not used for borders/glows anymore, but keeping a simple function for safety
function getUrgencyStyles(score: number | null) {
  return { urgent: (score || 1) >= 4 };
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

  const { savedArticles, toggleSavedArticle } = useUserPreferences();
  const isSaved = savedArticles.includes(item.id);

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
      whileHover={{ y: -2, transition: { type: "spring", stiffness: 400, damping: 28 } }}
      className="cursor-default"
      style={{ animationFillMode: "both" }}
    >
      <div className="flex flex-col rounded-[1.5rem] bg-[#FFFFFF] shadow-[0_10px_40px_rgba(0,0,0,0.04)] p-5 sm:p-6 mb-4">
        
        {/* ── Header: Category, Share ─────────── */}
        <div className="mb-3 flex items-start justify-between gap-2">
          {categoryConfig && CategoryIcon ? (
            <div className="flex items-center gap-2">
              <span className="bg-slate-50 border border-slate-200 text-[10px] px-2.5 py-1 rounded-full text-slate-600 uppercase tracking-widest inline-flex items-center gap-1.5 font-bold">
                <CategoryIcon className="h-3 w-3 text-slate-400" />
                {item.category}
              </span>
              {/* Interest / Trending Badge */}
              {item.interest_score && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                  item.interest_score >= 8
                    ? "bg-rose-50 border border-rose-200 text-rose-500"
                    : "bg-slate-50 border border-slate-200 text-slate-500"
                }`}>
                  {item.interest_score >= 8 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <Flame className="h-3 w-3 text-slate-400" />
                  )}
                  {item.interest_score >= 8 ? `Trending · ${item.interest_score}/10` : `${item.interest_score}/10`}
                </span>
              )}
            </div>
          ) : <div />}
          <div className="flex items-center gap-1">
            <button
              onClick={() => toggleSavedArticle(item.id)}
              aria-label="שמור"
              className={`flex-shrink-0 rounded-full p-2.5 transition-colors focus:outline-none ${
                isSaved ? "bg-blue-50 text-[#1959FF]" : "bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              }`}
            >
              <Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
            </button>
            <button
              onClick={handleShare}
              aria-label="שתף"
              className="flex-shrink-0 rounded-full p-2.5 bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── AI Title (The Headline) ─────────── */}
        {displayTitle && (
          <h2 className="mb-4 text-xl md:text-[22px] font-extrabold text-[#16161B] tracking-tight leading-snug font-sans">
            {displayTitle}
          </h2>
        )}

        {/* ── Media ───────────────────────────────────── */}
        {item.media_url && (
          <div className="relative mb-4 flex items-center justify-center overflow-hidden rounded-2xl bg-[#F8F9FA] border border-slate-100 p-2 sm:p-3">
            {item.media_type === "video" || item.media_url.endsWith(".mp4") ? (
              <video
                src={item.media_url}
                controls
                preload="metadata"
                className="max-h-80 w-full object-contain sm:max-h-[440px] rounded-xl"
              />
            ) : (
              <>
                <img
                  src={item.media_url}
                  alt="תמונה מצורפת"
                  loading="lazy"
                  className="max-h-80 w-full object-contain sm:max-h-[440px] rounded-xl shadow-sm"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div className="hidden h-40 w-full items-center justify-center">
                  <ImageIcon className="h-7 w-7 text-slate-300" />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Content ─────────────────────────────────── */}
        {item.content && (
          <div
            className="feed-content"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        )}

        {/* ── Footer / Timestamp ──────────────────────── */}
        <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            {/* Urgency Dot */}
            {isHighUrgency && (
              <div className="flex items-center gap-1.5" title="עדכון דחוף">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">דחוף</span>
              </div>
            )}
          </div>
          <time
            dateTime={item.timestamp}
            title={fullTime}
            className="text-[11px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1"
          >
            <Clock className="h-3 w-3" />
            {relativeTime}
          </time>
        </div>
      </div>
    </motion.article>
  );
}
