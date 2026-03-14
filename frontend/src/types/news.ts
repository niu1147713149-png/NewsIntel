export type SentimentLabel = "positive" | "negative" | "neutral";

export interface NewsCategory {
  id: number;
  name: string;
  slug: string;
}

export interface SentimentResult {
  label: SentimentLabel;
  positive: number;
  negative: number;
  neutral: number;
  confidence: number;
}

export interface StockImpact {
  stock_id: number;
  impact_score: number;
  direction: "bullish" | "bearish" | "neutral";
  confidence: number;
  reasoning: string | null;
}

export interface Article {
  id: number;
  title: string;
  description: string | null;
  url: string;
  source_name: string | null;
  published_at: string;
  language: string | null;
  categories: NewsCategory[] | null;
  sentiment: SentimentResult | null;
  impacts: StockImpact[];
}
