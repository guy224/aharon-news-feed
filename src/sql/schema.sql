-- ============================================
-- LIVE NEWS FEED — Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Create the news_feed table
CREATE TABLE IF NOT EXISTS public.news_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_message_id INTEGER NOT NULL UNIQUE,
    content TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    media_url TEXT,
    is_urgent BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_feed_timestamp 
    ON public.news_feed (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_news_feed_telegram_id 
    ON public.news_feed (telegram_message_id);

-- 3. Create trigger function to auto-detect urgent messages
CREATE OR REPLACE FUNCTION public.check_urgent_keywords()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the content contains urgent Hebrew keywords
    IF NEW.content IS NOT NULL AND (
        NEW.content ILIKE '%צבע אדום%' OR
        NEW.content ILIKE '%אזעקה%' OR
        NEW.content ILIKE '%ירי רקטות%' OR
        NEW.content ILIKE '%חדירת מחבלים%' OR
        NEW.content ILIKE '%פיגוע%' OR
        NEW.content ILIKE '%אירוע חמור%'
    ) THEN
        NEW.is_urgent := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach trigger to news_feed table
DROP TRIGGER IF EXISTS trg_check_urgent ON public.news_feed;
CREATE TRIGGER trg_check_urgent
    BEFORE INSERT OR UPDATE ON public.news_feed
    FOR EACH ROW
    EXECUTE FUNCTION public.check_urgent_keywords();

-- 5. Enable Row Level Security
ALTER TABLE public.news_feed ENABLE ROW LEVEL SECURITY;

-- 6. Public SELECT policy (allows frontend to read data with anon key)
CREATE POLICY "Allow public read access"
    ON public.news_feed
    FOR SELECT
    USING (true);

-- 7. Service role INSERT/UPDATE policy (scraper uses service_role key)
CREATE POLICY "Allow service role full access"
    ON public.news_feed
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 8. Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.news_feed;

-- ============================================
-- DONE! Make sure to also enable Realtime in:
-- Supabase Dashboard → Database → Replication
-- ============================================
