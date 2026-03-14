export interface StockSnapshot {
  latest_close: number | null;
  previous_close: number | null;
  change: number | null;
  change_percent: number | null;
  last_updated_at: string | null;
}

export interface StockPricePoint {
  time: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
}

export interface StockImpactSummary {
  total_signals: number;
  bullish_count: number;
  bearish_count: number;
  neutral_count: number;
  average_impact_score: number;
  weighted_impact_score: number;
  average_confidence: number;
  overall_direction: "bullish" | "bearish" | "neutral" | string;
}

export interface StockRelatedArticle {
  article_id: number;
  title: string;
  published_at: string;
  source_name: string | null;
  direction: "bullish" | "bearish" | "neutral" | string;
  impact_score: number;
  confidence: number;
}

export interface StockDetail {
  id: number;
  ticker: string;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  market_cap: number | null;
  snapshot: StockSnapshot;
  prices: StockPricePoint[];
  impact_summary: StockImpactSummary;
  related_articles: StockRelatedArticle[];
}

export interface StockSyncStatus {
  enabled: boolean;
  running: boolean;
  provider_name: string | null;
  last_started_at: string | null;
  last_finished_at: string | null;
  last_succeeded_at: string | null;
  last_error: string | null;
  tickers_requested: number;
  tickers_succeeded: number;
  tickers_failed: number;
  price_points_fetched: number;
  inserted: number;
  updated: number;
  updated_at: string;
}

export interface WatchlistItem {
  stock_id: number;
  ticker: string;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  market_cap: number | null;
  snapshot: StockSnapshot;
  added_at: string;
}

export interface PriceAlertItem {
  alert_id: number;
  stock_id: number;
  ticker: string;
  stock_name: string | null;
  operator: "above" | "below";
  threshold: number;
  status: "active" | "triggered";
  is_active: boolean;
  triggered_at: string | null;
  triggered_price: number | null;
  is_read: boolean;
  created_at: string;
  snapshot: StockSnapshot;
}
