import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client using the public anon key.
 * Safe to use in client components — respects RLS policies.
 * Returns null if environment variables are not configured.
 */
export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
