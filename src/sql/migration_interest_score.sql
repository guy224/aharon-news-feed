-- Add interest_score to support trending feature
ALTER TABLE public.news_feed ADD COLUMN IF NOT EXISTS interest_score INT DEFAULT NULL CHECK (interest_score >= 1 AND interest_score <= 10);
