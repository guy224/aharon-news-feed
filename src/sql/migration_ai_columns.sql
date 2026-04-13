-- ============================================
-- AI Enhancement Migration
-- Run this in your Supabase SQL Editor
-- ============================================

-- Add AI-generated columns to news_feed
ALTER TABLE public.news_feed
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS ai_title TEXT,
  ADD COLUMN IF NOT EXISTS urgency_score INTEGER DEFAULT 1 CHECK (urgency_score BETWEEN 1 AND 5);

-- Update the is_urgent column to be driven by urgency_score >= 4
-- (The existing trigger still works, but urgency_score gives finer control)
