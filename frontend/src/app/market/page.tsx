import Link from "next/link";

import { NumericFilterPanel } from "@/components/numeric-filter-panel";
import { apiGet } from "@/lib/api";
import { buildNumericQueryHref, resolveBoundedQuery } from "@/lib/analysis-query";
import type { ApiResponse } from "@/types/api";
import type { MarketAnalysisData, MarketAnalysisQueryParams, MarketDirection } from "@/types/analysis";
import type { StockDetail } from "@/types/stocks";

interface MarketPageProps {
  searchParams?: Promise<{
    window_hours?: string;
    article_limit?: string;
    top_stocks?: string;
    latest_events?: string;
  }>;
}

interface MarketPageData {
  response: ApiResponse<MarketAnalysisData>;
  hasError: boolean;
}

interface MarketPriceCardData {
  stockId: number;
  ticker: string;
  name: string | null;
  latestClose: number | null;
  changePercent5d: number | null;
  prices: StockDetail["prices"];
}

const MARKET_QUERY_BOUNDS = {
  window_hours: { min: 1, max: 168, fallback: 24 },
  article_limit: { min: 1, max: 500, fallback: 200 },
  top_stocks: { min: 1, max: 50, fallback: 12 },
  latest_events: { min: 1, max: 50, fallback: 10 }
} as const;

const MARKET_FILTER_FIELDS = [
  { key: "window_hours", label: "时间窗口 (h)", min: 1, max: 168, fallback: 24 },
  { key: "article_limit", label: "样本上限", min: 1, max: 500, fallback: 200 },
  { key: "top_stocks", label: "个股数量", min: 1, max: 50, fallback: 12 },
  { key: "latest_events", label: "事件条数", min: 1, max: 50, fallback: 10 }
];

const MARKET_FILTER_PRESETS: Array<{ label: string; query: MarketAnalysisQueryParams }> = [
  { label: "默认窗口", query: { window_hours: 24, article_limit: 200, top_stocks: 12, latest_events: 10 } },
  { label: "快照模式", query: { window_hours: 6, article_limit: 120, top_stocks: 8, latest_events: 8 } },
  { label: "覆盖优先", query: { window_hours: 72, article_limit: 350, top_stocks: 20, latest_events: 20 } },
  { label: "排行优先", query: { window_hours: 24, article_limit: 300, top_stocks: 30, latest_events: 10 } }
];

const WIDTH_CLASSES = [
  "w-0",
  "w-1/12",
  "w-2/12",
  "w-3/12",
  "w-4/12",
  "w-5/12",
  "w-6/12",
  "w-7/12",
  "w-8/12",
  "w-9/12",
  "w-10/12",
  "w-11/12",
  "w-full"
] as const;

const DIRECTION_META: Record<
  MarketDirection,
  {
    label: string;
    textClass: string;
    bgClass: string;
    symbol: string;
  }
> = {
  bullish: {
    label: "利好",
    textClass: "text-emerald-400",
    bgClass: "bg-emerald-400",
    symbol: "↑"
  },
  bearish: {
    label: "利空",
    textClass: "text-red-400",
    bgClass: "bg-red-400",
    symbol: "↓"
  },
  neutral: {
    label: "中性",
    textClass: "text-amber-400",
    bgClass: "bg-amber-400",
    symbol: "—"
  }
};

function resolveMarketQuery(
  searchParams:
    | { window_hours?: string; article_limit?: string; top_stocks?: string; latest_events?: string }
    | undefined
): MarketAnalysisQueryParams {
  return resolveBoundedQuery(searchParams, MARKET_QUERY_BOUNDS);
}

async function fetchMarketData(query: MarketAnalysisQueryParams): Promise<MarketPageData> {
  try {
    const response = await apiGet<MarketAnalysisData>("/api/v1/analysis/market", query);
    return { response, hasError: false };
  } catch {
    return {
      response: {
        status: "error",
        data: {
          generated_at: new Date().toISOString(),
          market_pulse: {
            value: 0,
            direction: "neutral",
            sample_size: 0
          },
          direction_distribution: [
            { direction: "bullish", count: 0, ratio: 0 },
            { direction: "bearish", count: 0, ratio: 0 },
            { direction: "neutral", count: 0, ratio: 0 }
          ],
          stock_rankings: [],
          latest_events: []
        }
      },
      hasError: true
    };
  }
}

async function fetchMarketPriceCards(stockIds: number[]): Promise<MarketPriceCardData[]> {
  if (stockIds.length === 0) {
    return [];
  }

  const cards = await Promise.all(
    stockIds.map(async (stockId) => {
      try {
        const response = await apiGet<StockDetail>(`/api/v1/stocks/${stockId}`, {
          window_hours: 240,
          price_points: 5,
          related_articles: 5
        });
        const stock = response.data;
        const validPrices = stock.prices.filter((item) => item.close !== null);
        const firstClose = validPrices[0]?.close ?? null;
        const lastClose = validPrices[validPrices.length - 1]?.close ?? null;
        const changePercent5d =
          firstClose !== null && lastClose !== null && firstClose !== 0
            ? Number((((lastClose - firstClose) / firstClose) * 100).toFixed(2))
            : null;

        return {
          stockId: stock.id,
          ticker: stock.ticker,
          name: stock.name,
          latestClose: stock.snapshot.latest_close,
          changePercent5d,
          prices: stock.prices
        } satisfies MarketPriceCardData;
      } catch {
        return null;
      }
    })
  );

  return cards
    .filter((item): item is MarketPriceCardData => item !== null)
    .sort((left, right) => Math.abs(right.changePercent5d ?? 0) - Math.abs(left.changePercent5d ?? 0));
}

function formatDateTime(isoString: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(isoString));
}

function formatShortDate(isoString: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(isoString));
}

function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function normalizePercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getWidthClass(percent: number): (typeof WIDTH_CLASSES)[number] {
  const normalized = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const index = Math.round(normalized / (100 / (WIDTH_CLASSES.length - 1)));
  return WIDTH_CLASSES[index];
}

function getDirectionCount(
  distribution: MarketAnalysisData["direction_distribution"],
  direction: MarketDirection
): number {
  return distribution.find((item) => item.direction === direction)?.count ?? 0;
}

function getDirectionRatio(
  distribution: MarketAnalysisData["direction_distribution"],
  direction: MarketDirection
): number {
  const ratio = distribution.find((item) => item.direction === direction)?.ratio ?? 0;
  return normalizePercent(ratio * 100);
}

function buildLatestPublishedAtByStock(latestEvents: MarketAnalysisData["latest_events"]): Map<number, string> {
  const latestPublishedAtByStock = new Map<number, string>();
  for (const event of latestEvents) {
    if (!latestPublishedAtByStock.has(event.stock_id)) {
      latestPublishedAtByStock.set(event.stock_id, event.published_at);
    }
  }
  return latestPublishedAtByStock;
}

export default async function MarketPage({ searchParams }: MarketPageProps): Promise<JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const query = resolveMarketQuery(resolvedSearchParams);
  const { response, hasError } = await fetchMarketData(query);
  const marketData = response.data;
  const stockRanking = marketData.stock_rankings;
  const latestEvents = marketData.latest_events;
  const priceCardStockIds = stockRanking.slice(0, 6).map((stock) => stock.stock_id);
  const priceCards = await fetchMarketPriceCards(priceCardStockIds);
  const latestPublishedAtByStock = buildLatestPublishedAtByStock(latestEvents);
  const sampledArticles = new Set(latestEvents.map((event) => event.article_id)).size;

  const totalSignals = marketData.market_pulse.sample_size;
  const bullishSignals = getDirectionCount(marketData.direction_distribution, "bullish");
  const bearishSignals = getDirectionCount(marketData.direction_distribution, "bearish");
  const neutralSignals = getDirectionCount(marketData.direction_distribution, "neutral");

  const pulseScore = Math.max(-1, Math.min(1, marketData.market_pulse.value));
  const pulseDirection: MarketDirection = marketData.market_pulse.direction;
  const pulseMeta = DIRECTION_META[pulseDirection];
  const pulsePercent = normalizePercent((pulseScore + 1) * 50);

  const bullishPercent = getDirectionRatio(marketData.direction_distribution, "bullish");
  const bearishPercent = getDirectionRatio(marketData.direction_distribution, "bearish");
  const neutralPercent = getDirectionRatio(marketData.direction_distribution, "neutral");

  return (
    <main className="page-shell">
      <section className="page-container space-y-6">
        <header className="page-hero overflow-hidden p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
          <div>
            <p className="eyebrow-label">Market pulse</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">市场脉冲</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              基于 /api/v1/analysis/market 聚合结果，展示市场方向、个股影响排行与最新事件。
            </p>
          </div>
          <div className="content-panel p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pulse summary</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-950">{sampledArticles}</p>
                <p className="text-xs text-slate-500">样本新闻</p>
              </div>
              <div>
                <p className={`text-2xl font-semibold ${pulseMeta.textClass}`}>{pulseMeta.label}</p>
                <p className="text-xs text-slate-500">综合方向</p>
              </div>
            </div>
          </div>
          </div>
          <NumericFilterPanel
            pathname="/market"
            currentQuery={query}
            fields={MARKET_FILTER_FIELDS}
            presets={MARKET_FILTER_PRESETS}
            summaryItems={[
              { label: "时间窗口", value: `${query.window_hours}h` },
              { label: "样本上限", value: query.article_limit },
              { label: "个股数", value: query.top_stocks },
              { label: "事件数", value: query.latest_events }
            ]}
            storageKey="newsintel.market.filters"
            secondaryLink={{
              href: buildNumericQueryHref("/analysis", {
                window_hours: query.window_hours,
                article_limit: query.article_limit
              }),
              label: "查看市场分析"
            }}
          />
          {hasError ? (
            <p className="mt-3 rounded-md border border-[#EF4444]/35 bg-[#EF444415] px-3 py-2 text-xs text-[#FCA5A5]">
              市场数据加载失败，当前展示为空结果。
            </p>
          ) : null}
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">样本新闻</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{sampledArticles}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">影响信号</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{totalSignals}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">覆盖个股</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{stockRanking.length}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">综合方向</p>
            <p className={`mt-3 text-3xl font-semibold tabular-nums ${pulseMeta.textClass}`}>{pulseMeta.label}</p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <article className="data-panel p-5">
            <h2 className="text-lg font-semibold">市场脉冲</h2>
            <p className="mt-1 text-xs text-[#94A3B8]">综合 impact_score 与 confidence 的加权结果</p>
            <div className="mt-4 rounded-lg border border-[#1E293B] bg-[#1A2035]/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#94A3B8]">脉冲指数</span>
                <span className={`font-semibold tabular-nums ${pulseMeta.textClass}`}>
                  {pulseMeta.symbol} {pulseScore.toFixed(2)}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#1E293B]">
                <div className={`h-2 rounded-full bg-[#3B82F6] ${getWidthClass(pulsePercent)}`} />
              </div>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-emerald-400">
                    <span aria-hidden="true">↑</span>
                    <span>利好信号</span>
                  </span>
                  <span className="tabular-nums text-[#94A3B8]">
                    {bullishSignals} · {bullishPercent}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#1E293B]">
                  <div className={`h-2 rounded-full bg-emerald-400 ${getWidthClass(bullishPercent)}`} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-red-400">
                    <span aria-hidden="true">↓</span>
                    <span>利空信号</span>
                  </span>
                  <span className="tabular-nums text-[#94A3B8]">
                    {bearishSignals} · {bearishPercent}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#1E293B]">
                  <div className={`h-2 rounded-full bg-red-400 ${getWidthClass(bearishPercent)}`} />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-amber-400">
                    <span aria-hidden="true">—</span>
                    <span>中性信号</span>
                  </span>
                  <span className="tabular-nums text-[#94A3B8]">
                    {neutralSignals} · {neutralPercent}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#1E293B]">
                  <div className={`h-2 rounded-full bg-amber-400 ${getWidthClass(neutralPercent)}`} />
                </div>
              </div>
            </div>
          </article>

          <article className="content-panel-strong p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">个股影响排行</h2>
              <Link href="/news" className="text-sm text-[#3B82F6] transition-colors hover:text-[#2563EB]">
                查看新闻流
              </Link>
            </div>
            {stockRanking.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#1E293B] px-4 py-10 text-center text-sm text-[#94A3B8]">
                暂无个股影响数据
              </div>
            ) : (
              <div className="space-y-3">
                {stockRanking.map((stock, index) => {
                  const directionMeta = DIRECTION_META[stock.dominant_direction];
                  const stockLabel = stock.ticker ? `${stock.ticker} · #${stock.stock_id}` : `Stock #${stock.stock_id}`;
                  const latestPublishedAt = latestPublishedAtByStock.get(stock.stock_id);
                  return (
                    <article
                      key={stock.stock_id}
                      className="content-panel p-4 transition-colors hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="rounded-md bg-[#0A0E1A] px-2 py-1 tabular-nums text-[#94A3B8]">
                              #{index + 1}
                            </span>
                            <Link href={`/analysis/${stock.stock_id}`} className="font-semibold hover:text-[#3B82F6]">
                              {stockLabel}
                            </Link>
                          </div>
                          {latestPublishedAt ? (
                            <div className="text-xs text-[#94A3B8]">最近信号时间：{formatDateTime(latestPublishedAt)}</div>
                          ) : null}
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs ${directionMeta.textClass}`}>
                          <span aria-hidden="true">{directionMeta.symbol}</span>
                          <span>{directionMeta.label}</span>
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#94A3B8]">
                        <span className="tabular-nums">信号数：{stock.signal_count}</span>
                        <span aria-hidden="true">•</span>
                        <span className="tabular-nums">平均分：{stock.avg_impact_score.toFixed(2)}</span>
                        <span aria-hidden="true">•</span>
                        <span className="tabular-nums">最大强度：{stock.max_abs_impact_score.toFixed(2)}</span>
                        <span aria-hidden="true">•</span>
                        <span className={`tabular-nums ${directionMeta.textClass}`}>主导方向：{directionMeta.label}</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <section className="data-panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">5日价格变化卡片</h2>
              <p className="mt-1 text-xs text-[#94A3B8]">按近 5 个交易日绝对涨跌幅排序，快速查看波动最大的股票。</p>
            </div>
            <Link href="/analysis" className="text-sm text-[#3B82F6] transition-colors hover:text-[#2563EB]">
              查看个股分析
            </Link>
          </div>
          {priceCards.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#1E293B] px-4 py-10 text-center text-sm text-[#94A3B8]">
              暂无可展示的价格卡片数据
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {priceCards.map((card) => {
                const cardDirection: MarketDirection =
                  card.changePercent5d === null ? "neutral" : card.changePercent5d >= 0 ? "bullish" : "bearish";
                const cardMeta = DIRECTION_META[cardDirection];
                const maxClose = Math.max(...card.prices.map((item) => item.close ?? 0), 0);

                return (
                  <article
                    key={card.stockId}
                    className="rounded-xl border border-[#1E293B] bg-[#111827] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.25)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/analysis/${card.stockId}`} className="text-base font-semibold hover:text-[#3B82F6]">
                          {card.ticker}
                        </Link>
                        <p className="mt-1 line-clamp-1 text-xs text-[#94A3B8]">{card.name ?? `Stock #${card.stockId}`}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-md bg-[#1E2A45] px-2 py-1 text-xs ${cardMeta.textClass}`}>
                        <span aria-hidden="true">{cardMeta.symbol}</span>
                        <span>{formatSignedPercent(card.changePercent5d)}</span>
                      </span>
                    </div>

                    <div className="mt-4 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#94A3B8]">最新价</p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">
                          {card.latestClose !== null ? card.latestClose.toFixed(2) : "--"}
                        </p>
                      </div>
                      <div className="text-right text-xs text-[#94A3B8]">
                        <p>样本</p>
                        <p className="mt-1 tabular-nums text-[#CBD5E1]">{card.prices.length} 天</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-5 gap-2">
                      {card.prices.map((price) => {
                        const closeValue = price.close ?? 0;
                        const heightPercent = maxClose > 0 ? Math.max(16, Math.round((closeValue / maxClose) * 100)) : 16;
                        const pointDirection: MarketDirection =
                          price.open !== null && price.close !== null
                            ? price.close >= price.open
                              ? "bullish"
                              : "bearish"
                            : "neutral";

                        return (
                          <div key={price.time} className="flex flex-col items-center gap-2">
                            <div className="flex h-24 w-full items-end justify-center rounded-md bg-[#0B1220] px-1 py-2">
                              <div
                                className={`w-full rounded-sm ${DIRECTION_META[pointDirection].bgClass}`}
                                style={{ height: `${heightPercent}%` }}
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-[11px] text-[#94A3B8]">{formatShortDate(price.time)}</p>
                              <p className="mt-1 text-[11px] tabular-nums text-[#CBD5E1]">
                                {price.close !== null ? price.close.toFixed(2) : "--"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="content-panel-strong p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">最新事件列表</h2>
            <Link href="/news" className="text-sm text-[#3B82F6] transition-colors hover:text-[#2563EB]">
              查看全部新闻
            </Link>
          </div>
          {latestEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#1E293B] px-4 py-10 text-center text-sm text-[#94A3B8]">
              暂无事件数据
            </div>
          ) : (
            <div className="space-y-3">
              {latestEvents.map((article) => {
                const eventDirectionMeta = DIRECTION_META[article.direction];
                const stockText = article.ticker ? `${article.ticker} · #${article.stock_id}` : `#${article.stock_id}`;
                return (
                  <article
                    key={`${article.article_id}-${article.stock_id}-${article.published_at}`}
                    className="content-panel p-4 transition-colors hover:border-slate-300"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="line-clamp-2 text-sm font-medium leading-6 sm:text-base">
                        <Link href={`/news/${article.article_id}`} className="hover:text-[#3B82F6]">
                          {article.article_title}
                        </Link>
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs ${eventDirectionMeta.textClass}`}
                      >
                        <span aria-hidden="true">{eventDirectionMeta.symbol}</span>
                        <span>{eventDirectionMeta.label}</span>
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
                      <span>{article.source_name ?? "未知来源"}</span>
                      <span aria-hidden="true">•</span>
                      <time dateTime={article.published_at}>{formatDateTime(article.published_at)}</time>
                      <span aria-hidden="true">•</span>
                      <span className="tabular-nums">标的：{stockText}</span>
                      <span aria-hidden="true">•</span>
                      <span className="tabular-nums">
                        影响分：{article.impact_score.toFixed(2)} · 置信度：{Math.round(article.confidence * 100)}%
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}



























































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































