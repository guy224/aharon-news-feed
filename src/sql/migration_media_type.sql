-- Migration to add media_type for handling videos
ALTER TABLE public.news_feed
ADD COLUMN IF NOT EXISTS media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image', 'video'));
