"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowUp, Loader2, WifiOff, Inbox } from "lucide-react";
import { createBrowserSupabaseClient } from "@/lib/supabase-browser";
import type { NewsFeedItem } from "@/lib/types";
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
export default function NewsFeed({ initialData }: NewsFeedProps) {
  const [items, setItems] = useState<NewsFeedItem[]>(initialData);
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

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Sticky Header */}
      <Header isConnected={isConnected} />

      {/* New message toast */}
      {showToast && newCount > 0 && (
        <div className="toast animate-toast-in">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-500/30 transition-all hover:bg-blue-400 hover:shadow-blue-400/40 active:scale-95"
          >
            <ArrowUp className="h-4 w-4" />
            <span>
              {newCount === 1 ? "עדכון חדש" : `${newCount} עדכונים חדשים`}
            </span>
          </button>
        </div>
      )}

      {/* Feed container */}
      <main className="relative mx-auto max-w-2xl px-4 py-6">
        <div ref={feedTopRef} />

        {/* Timeline line */}
        {items.length > 0 && <div className="timeline-line" />}

        {/* Empty state */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-32 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/50">
              <Inbox className="h-8 w-8 text-slate-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-400">אין עדכונים עדיין</p>
              <p className="mt-1 text-sm text-slate-600">
                עדכונים חדשים יופיעו כאן באופן אוטומטי
              </p>
            </div>
          </div>
        )}

        {/* Feed cards */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <FeedCard
              key={item.id}
              item={item}
              isNew={newIdsRef.current.has(item.id)}
              index={index}
            />
          ))}
        </div>

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={loadMoreRef} className="h-4" />

        {/* End of feed */}
        {!hasMore && items.length > 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-slate-600">── סוף העדכונים ──</p>
          </div>
        )}

        {/* Disconnected banner */}
        {!isConnected && items.length > 0 && (
          <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full bg-amber-500/20 px-4 py-2 text-sm text-amber-300 backdrop-blur-lg">
              <WifiOff className="h-4 w-4" />
              <span>מתחבר מחדש...</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
