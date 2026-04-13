import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { NewsFeedItem } from "@/lib/types";
import NewsFeed from "@/components/NewsFeed";

// Force dynamic rendering — this page depends on runtime database data
export const dynamic = "force-dynamic";

/**
 * Main page — Server Component
 *
 * Fetches initial feed data from Supabase on the server,
 * then passes it to the NewsFeed client component which
 * handles realtime updates and infinite scroll.
 */
export default async function Home() {
  let initialData: NewsFeedItem[] = [];

  try {
    // Skip Supabase call if env vars aren't configured yet
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn("Supabase environment variables not configured — starting with empty feed");
      return <NewsFeed initialData={[]} />;
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("news_feed")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error fetching initial data:", error);
    } else {
      initialData = data as NewsFeedItem[];
    }
  } catch (err) {
    // If Supabase is not configured yet, start with empty data
    console.error("Supabase connection error:", err);
  }

  return <NewsFeed initialData={initialData} />;
}
