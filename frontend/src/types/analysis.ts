export type MarketDirection = "bullish" | "bearish" | "neutral";
export type AnalysisSentimentLabel = "positive" | "negative" | "neutral";

export interface MarketPulse {
  value: number;
  direction: MarketDirection;
  sample_size: number;
}

export interface DirectionDistributionItem {
  direction: MarketDirection;
  count: number;
  ratio: number;
}

export interface StockRankingItem {
  stock_id: number;
  ticker: string | null;
  signal_count: number;
  avg_impact_score: number;
  max_abs_impact_score: number;
  dominant_direction: MarketDirection;
}

export interface LatestEventItem {
  article_id: number;
  article_title: string;
  published_at: string;
  source_name: string | null;
  stock_id: number;
  ticker: string | null;
  direction: MarketDirection;
  impact_score: number;
  confidence: number;
}

export interface MarketAnalysisData {
  generated_at: string;
  market_pulse: MarketPulse;
  direction_distribution: DirectionDistributionItem[];
  stock_rankings: StockRankingItem[];
  latest_events: LatestEventItem[];
}

export type MarketAnalysisQueryParams = Record<
  "window_hours" | "article_limit" | "top_stocks" | "latest_events",
  number
>;

export interface OverviewStatsCards {
  total_articles: number;
  analyzed_sentiment_articles: number;
  bullish_signals: number;
  bearish_signals: number;
}

export interface SentimentDistributionItem {
  label: AnalysisSentimentLabel;
  count: number;
  ratio: number;
}

export interface TopImpactSignalItem {
  article_id: number;
  article_title: string;
  published_at: string;
  stock_id: number;
  ticker: string | null;
  direction: MarketDirection;
  impact_score: number;
  confidence: number;
}

export interface AnalysisOverviewData {
  generated_at: string;
  stats_cards: OverviewStatsCards;
  sentiment_distribution: SentimentDistributionItem[];
  top_impact_signals: TopImpactSignalItem[];
}

export type AnalysisOverviewQueryParams = Record<"window_hours" | "article_limit" | "top_signals", number>;
