"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { ArrowUp, Loader2, WifiOff, Inbox } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import type { NewsFeedItem, NewsCategory } from "@/lib/types";
import Header from "./Header";
import FeedCard from "./FeedCard";

const PAGE_SIZE = 20;

interface NewsFeedProps {
  initialData: NewsFeedItem[];
}

/**
 * NewsFeed — Main feed component with Supabase Realtime + Infinite Scroll
 *
 * Features:
 * - Realtime subscription for INSERT and UPDATE events
 * - Infinite scroll with IntersectionObserver
 * - "New update" toast notification
 * - Loading and empty states
 */
const CATEGORIES: ("הכל" | NewsCategory)[] = [
  "הכל",
  "ביטחוני",
  "אזעקות",
  "פוליטי",
  "מדיני",
  "פלילי",
  "כללי",
];

export default function NewsFeed({ initialData }: NewsFeedProps) {
  const [items, setItems] = useState<NewsFeedItem[]>(initialData);
  const [activeCategory, setActiveCategory] = useState<"הכל" | NewsCategory>("הכל");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialData.length >= PAGE_SIZE);
  const [newCount, setNewCount] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const feedTopRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef<ReturnType<typeof createBrowserSupabaseClient>>(null);

  // Track new message IDs to animate them
  const newIdsRef = useRef<Set<string>>(new Set());

  // ── Realtime Subscription ────────────────────────────
  useEffect(() => {
    // Lazily create Supabase client on first mount
    if (!supabaseRef.current) {
      supabaseRef.current = createBrowserSupabaseClient();
    }
    const supabase = supabaseRef.current;
    if (!supabase) return; // Env vars not configured

    const channel = supabase
      .channel("news-feed-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "news_feed",
        },
        (payload) => {
          const newItem = payload.new as NewsFeedItem;
          newIdsRef.current.add(newItem.id);

          setItems((prev) => {
            // Don't add duplicates
            if (prev.some((item) => item.id === newItem.id)) return prev;
            return [newItem, ...prev];
          });

          // Show toast if user has scrolled down
          if (window.scrollY > 200) {
            setNewCount((c) => c + 1);
            setShowToast(true);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "news_feed",
        },
        (payload) => {
          const updatedItem = payload.new as NewsFeedItem;
          setItems((prev) =>
            prev.map((item) =>
              item.id === updatedItem.id ? updatedItem : item
            )
          );
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      if (supabase) supabase.removeChannel(channel);
    };
  }, []);

  // ── Infinite Scroll ──────────────────────────────────
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const supabase = supabaseRef.current;
    if (!supabase) {
      setIsLoadingMore(false);
      return;
    }
    const lastItem = items[items.length - 1];

    if (!lastItem) {
      setIsLoadingMore(false);
      return;
    }

    const { data, error } = await supabase
      .from("news_feed")
      .select("*")
      .order("timestamp", { ascending: false })
      .lt("timestamp", lastItem.timestamp)
      .limit(PAGE_SIZE);

    if (error) {
      console.error("Error loading more items:", error);
      setIsLoadingMore(false);
      return;
    }

    if (data.length < PAGE_SIZE) {
      setHasMore(false);
    }

    setItems((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      const newItems = data.filter((d: NewsFeedItem) => !existingIds.has(d.id));
      return [...prev, ...newItems];
    });

    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, items]);

  // ── IntersectionObserver for infinite scroll trigger ──
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  // ── Toast auto-dismiss ───────────────────────────────
  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => {
      setShowToast(false);
      setNewCount(0);
    }, 5000);
    return () => clearTimeout(timer);
  }, [showToast]);

  // ── Scroll to top handler ────────────────────────────
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setShowToast(false);
    setNewCount(0);
  };

  // ── Category Filtering ───────────────────────────────
  const filteredItems = useMemo(() => {
    if (activeCategory === "הכל") return items;
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  return (
    <div className="min-h-screen text-[#16161B] bg-transparent">
      {/* Sticky Header */}
      <Header isConnected={isConnected} />

      {/* Toast */}
      {showToast && newCount > 0 && (
        <div className="toast animate-toast-in">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-xl transition-all hover:scale-105 active:scale-95"
            style={{
              background: "#1959FF",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 8px 24px rgba(25, 89, 255, 0.35)",
            }}
          >
            <span>↑</span>
            <span>{newCount === 1 ? "עדכון חדש" : `${newCount} עדכונים חדשים`}</span>
          </button>
        </div>
      )}

      {/* Feed container — pt-20 clears the fixed header */}
      <main className="relative mx-auto max-w-[600px] px-4 pb-16 pt-[88px]">
        
        {/* Horizontal Category Scroller */}
        <div
          className="sticky top-[68px] z-40 -mx-4 mb-5 flex gap-2 overflow-x-auto px-4 py-3 hide-scrollbar"
          style={{ background: "#EFEFEF" }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className="whitespace-nowrap rounded-[1rem] px-4 py-2 text-[13.5px] font-medium transition-all"
              style={{
                background: activeCategory === cat ? "#1959FF" : "#FFFFFF",
                border: activeCategory === cat ? "1px solid #1959FF" : "1px solid #E5E7EB",
                color: activeCategory === cat ? "#fff" : "#16161B",
                boxShadow: activeCategory === cat ? "0 4px 12px rgba(25, 89, 255, 0.25)" : "0 2px 4px rgba(0,0,0,0.02)",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <div ref={feedTopRef} />

        {/* Empty state */}
        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-5 py-32 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm">
              <Inbox className="h-7 w-7 text-slate-400" />
            </div>
            <div>
              <p className="text-base font-semibold text-[#16161B]">אין עדכונים עדיין</p>
              <p className="mt-1 text-sm text-slate-500">עדכונים חדשים יופיעו כאן באופן אוטומטי</p>
            </div>
          </div>
        )}

        {/* Feed cards */}
        <div className="space-y-4">
          {filteredItems.map((item, index) => (
            <FeedCard
              key={item.id}
              item={item}
              isNew={newIdsRef.current.has(item.id)}
              index={index}
            />
          ))}
        </div>

        {/* Loading spinner */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="h-4" />

        {/* End of feed */}
        {!hasMore && filteredItems.length > 0 && (
          <div className="py-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">· סוף העדכונים ·</p>
          </div>
        )}

        {/* Disconnected banner */}
        {!isConnected && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full px-4 py-2 text-sm bg-orange-50 border border-orange-200 text-orange-700 shadow-md">
              <WifiOff className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">מתחבר מחדש...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
