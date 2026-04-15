/**
 * TypeScript types for the Live News Feed application
 */

export type NewsCategory =
  | "ביטחוני"
  | "אזעקות"
  | "פוליטי"
  | "מדיני"
  | "פלילי"
  | "כללי";

export interface NewsFeedItem {
  id: string;
  telegram_message_id: number;
  content: string | null;
  timestamp: string;
  media_url: string | null;
  media_type?: "image" | "video";
  is_urgent: boolean;
  created_at: string;
  // AI-generated fields
  category: NewsCategory | null;
  ai_title: string | null;
  urgency_score: number | null;
  interest_score: number | null;
}

export interface ScrapedMessage {
  telegram_message_id: number;
  content: string | null;
  timestamp: string;
  media_url: string | null;
  media_type?: "image" | "video";
  is_urgent: boolean;
  // AI-generated fields
  category: NewsCategory | null;
  ai_title: string | null;
  urgency_score: number | null;
  interest_score: number | null;
}

export interface AiAnalysis {
  ai_title: string;
  category: NewsCategory;
  urgency_score: number;
  interest_score: number;
}

export interface ScrapeResponse {
  success: boolean;
  message: string;
  count?: number;
  errors?: string[];
}
