import Link from "next/link";

import { LoginRequiredCard } from "@/components/login-required-card";
import { PriceAlertForm } from "@/components/price-alert-form";
import { StockPriceLineChart } from "@/components/stock-price-line-chart";
import { StockSyncStatusPanel } from "@/components/stock-sync-status-panel";
import { apiGet } from "@/lib/api";
import { WatchlistToggleButton } from "@/components/watchlist-toggle-button";
import { fetchCurrentUser, isUnauthorizedError } from "@/lib/auth";
import type { StockDetail, WatchlistItem } from "@/types/stocks";

interface StockAnalysisPageProps {
  params: Promise<{
    stockId: string;
  }>;
}

interface StockAnalysisData {
  stock: StockDetail | null;
  hasError: boolean;
}

async function fetchStockAnalysisData(stockId: number): Promise<StockAnalysisData> {
  try {
    const response = await apiGet<StockDetail>(`/api/v1/stocks/${stockId}`, {
      window_hours: 168,
      price_points: 30,
      related_articles: 20
    });
    return { stock: response.data, hasError: false };
  } catch {
    return { stock: null, hasError: true };
  }
}

async function fetchWatchlistIds(): Promise<Set<number>> {
  try {
    const response = await apiGet<WatchlistItem[]>("/api/v1/watchlist");
    return new Set(response.data.map((item) => item.stock_id));
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return new Set<number>();
    }
    return new Set<number>();
  }
}

function parseStockId(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
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

function formatSignedNumber(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(3)}`;
}

function formatPriceDate(isoString: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(isoString));
}

function formatSignedPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatLargeNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "--";
  }

  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  }

  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  return value.toLocaleString("en-US");
}

export default async function StockAnalysisPage({ params }: StockAnalysisPageProps): Promise<JSX.Element> {
  const { stockId } = await params;
  const currentUser = await fetchCurrentUser();
  const targetStockId = parseStockId(stockId);

  if (!targetStockId) {
    return (
      <main className="page-shell">
        <section className="page-container max-w-5xl">
          <article className="page-hero p-8 text-center">
            <h1 className="text-2xl font-semibold">无效的股票 ID</h1>
            <p className="mt-2 text-sm text-[#94A3B8]">请输入正整数标识，例如 `/analysis/1`。</p>
            <Link
              href="/analysis"
              className="button-secondary mt-4 inline-flex rounded-xl px-4 py-2 text-sm"
            >
              返回市场分析
            </Link>
          </article>
        </section>
      </main>
    );
  }

  const { stock, hasError } = await fetchStockAnalysisData(targetStockId);
  const watchlistIds = await fetchWatchlistIds();
  const inWatchlist = watchlistIds.has(targetStockId);
  const totalSignals = stock?.impact_summary.total_signals ?? 0;
  const bullishCount = stock?.impact_summary.bullish_count ?? 0;
  const bearishCount = stock?.impact_summary.bearish_count ?? 0;
  const neutralCount = stock?.impact_summary.neutral_count ?? 0;
  const averageImpact = stock?.impact_summary.average_impact_score ?? 0;
  const weightedImpact = stock?.impact_summary.weighted_impact_score ?? 0;
  const averageConfidence = stock?.impact_summary.average_confidence ?? 0;
  const latestClose = stock?.snapshot.latest_close ?? null;
  const previousClose = stock?.snapshot.previous_close ?? null;
  const latestVolume = stock?.prices.at(-1)?.volume ?? null;
  const priceWindowLabel = stock?.prices.length ? `近 ${stock.prices.length} 个交易点` : "暂无价格窗口";
  const latestArticle = stock?.related_articles[0] ?? null;
  const headerDescription = stock
    ? [stock.exchange, stock.sector, stock.industry, stock.country].filter(Boolean).join(" · ") || "暂无股票元数据"
    : "当前无法加载该个股详情。";

  const overallDirection: "bullish" | "bearish" | "neutral" =
    stock?.impact_summary.overall_direction === "bullish" ||
    stock?.impact_summary.overall_direction === "bearish" ||
    stock?.impact_summary.overall_direction === "neutral"
      ? stock.impact_summary.overall_direction
      : "neutral";

  const directionMeta: Record<
    "bullish" | "bearish" | "neutral",
    { label: string; textClass: string; bgClass: string; symbol: string }
  > = {
    bullish: {
      label: "利好",
      textClass: "text-emerald-400",
      bgClass: "border-emerald-500/30 bg-emerald-500/10",
      symbol: "▲"
    },
    bearish: {
      label: "利空",
      textClass: "text-red-400",
      bgClass: "border-red-500/30 bg-red-500/10",
      symbol: "▼"
    },
    neutral: {
      label: "中性",
      textClass: "text-amber-300",
      bgClass: "border-amber-500/30 bg-amber-500/10",
      symbol: "■"
    }
  };

  const overallMeta = directionMeta[overallDirection];

  return (
    <main className="page-shell">
      <section className="page-container max-w-7xl space-y-6">
        <header className="page-hero p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <p className="eyebrow-label">Stock analysis</p>
                <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium ${overallMeta.textClass} ${overallMeta.bgClass}`}>
                  {overallMeta.symbol} {overallMeta.label}
                </span>
                <span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-600">
                  {priceWindowLabel}
                </span>
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                {stock ? `${stock.ticker}${stock.name ? ` · ${stock.name}` : ""}` : `个股分析 #${targetStockId}`}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{headerDescription}</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {stock ? (
                  currentUser ? (
                    <WatchlistToggleButton stockId={stock.id} initialInWatchlist={inWatchlist} />
                  ) : (
                    <Link href="/login" className="button-secondary inline-flex rounded-xl px-3 py-2 text-sm">
                      登录后加入自选
                    </Link>
                  )
                ) : null}
                <Link
                  href="/stocks"
                  className="button-secondary inline-flex rounded-xl px-4 py-2 text-sm"
                >
                  查看股票列表
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/market"
                className="button-secondary inline-flex rounded-xl px-4 py-2 text-sm"
              >
                返回市场脉冲
              </Link>
              <Link
                href="/analysis"
                className="button-secondary inline-flex rounded-xl px-4 py-2 text-sm"
              >
                返回分析总览
              </Link>
            </div>
          </div>
          {hasError ? (
            <p className="mt-4 rounded-md border border-[#EF4444]/35 bg-[#EF444415] px-3 py-2 text-xs text-[#FCA5A5]">
              个股数据加载失败，当前展示为空结果。
            </p>
          ) : null}

          {stock ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
              <article className="content-panel-strong p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Research brief</p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  {overallMeta.label === "中性"
                    ? "市场信号仍在等待更清晰方向。"
                    : `${stock.ticker} 当前呈现${overallMeta.label}倾向。`}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  最近窗口内累计 {totalSignals} 条影响信号，平均置信度 {Math.round(averageConfidence * 100)}%，加权影响分为 {formatSignedNumber(weightedImpact)}。
                  {latestArticle ? ` 最新一条相关事件来自 ${latestArticle.source_name ?? "未知来源"}。` : " 当前暂无新增事件标题可供提示。"}
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Latest close</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">
                      {latestClose !== null ? latestClose.toFixed(2) : "--"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Day move {formatSignedPercent(stock.snapshot.change_percent)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Market cap</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{formatLargeNumber(stock.market_cap)}</p>
                    <p className="mt-1 text-xs text-slate-500">Previous close {previousClose !== null ? previousClose.toFixed(2) : "--"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Latest volume</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{formatLargeNumber(latestVolume)}</p>
                    <p className="mt-1 text-xs text-slate-500">更新时间 {stock.snapshot.last_updated_at ? formatDateTime(stock.snapshot.last_updated_at) : "--"}</p>
                  </div>
                </div>
              </article>

              <article className="data-panel p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Signal mix</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">新闻信号分布</h2>
                  </div>
                  <p className="text-xs text-slate-300">观察窗口 168h</p>
                </div>
                <div className="mt-5 space-y-3">
                  {[
                    { label: "Bullish", value: bullishCount, tone: "bg-emerald-400" },
                    { label: "Bearish", value: bearishCount, tone: "bg-rose-400" },
                    { label: "Neutral", value: neutralCount, tone: "bg-amber-300" }
                  ].map((item) => {
                    const width = totalSignals > 0 ? `${Math.max((item.value / totalSignals) * 100, item.value > 0 ? 12 : 0)}%` : "0%";
                    return (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-slate-200">
                          <span>{item.label}</span>
                          <span className="tabular-nums">{item.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className={`h-full rounded-full ${item.tone}`} style={{ width }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="data-subpanel px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Average impact</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums text-white">{formatSignedNumber(averageImpact)}</p>
                  </div>
                  <div className="data-subpanel px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Weighted impact</p>
                    <p className="mt-2 text-xl font-semibold tabular-nums text-white">{formatSignedNumber(weightedImpact)}</p>
                  </div>
                </div>
              </article>
            </div>
          ) : null}
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <article className="content-panel p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Total signals</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{totalSignals}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Bullish</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-emerald-600">{bullishCount}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Bearish</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-rose-600">{bearishCount}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Neutral</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-amber-600">{neutralCount}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Confidence</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{Math.round(averageConfidence * 100)}%</p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.9fr)]">
          <article className="content-panel-strong p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">综合结论</h2>
              <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${overallMeta.textClass} ${overallMeta.bgClass}`}>
                {overallMeta.label}
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div className={`rounded-lg border px-4 py-3 ${overallMeta.bgClass}`}>
                <p className={`inline-flex items-center gap-1 text-base font-medium ${overallMeta.textClass}`}>
                  <span aria-hidden="true">{overallMeta.symbol}</span>
                  <span>{overallMeta.label}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500">加权影响分数达到 ±0.20 以上时，判定为显著方向。</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="text-slate-500">加权影响</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">{formatSignedNumber(weightedImpact)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="text-slate-500">最新收盘</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">{latestClose !== null ? latestClose.toFixed(2) : "--"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="text-slate-500">日度变化</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">
                  {stock?.snapshot.change !== null && stock?.snapshot.change !== undefined
                    ? `${stock.snapshot.change > 0 ? "+" : ""}${stock.snapshot.change.toFixed(2)}${
                        stock.snapshot.change_percent !== null && stock.snapshot.change_percent !== undefined
                          ? ` (${stock.snapshot.change_percent.toFixed(2)}%)`
                          : ""
                        }`
                    : "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p className="text-slate-500">价格更新时间</p>
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {stock?.snapshot.last_updated_at ? formatDateTime(stock.snapshot.last_updated_at) : "--"}
                </p>
              </div>
            </div>
          </article>

          <article className="content-panel-strong p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="eyebrow-label">Related coverage</p>
                <h2 className="mt-2 text-lg font-semibold text-slate-950">关联新闻</h2>
              </div>
              <span className="text-xs text-slate-500">共 {stock?.related_articles.length ?? 0} 条</span>
            </div>
            {(stock?.related_articles.length ?? 0) === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                当前时间窗口内暂无该个股的影响新闻。
              </div>
            ) : (
              <div className="space-y-3">
                {stock?.related_articles.map((article) => {
                  const key = article.direction === "bullish" || article.direction === "bearish" || article.direction === "neutral"
                    ? article.direction
                    : "neutral";
                  const meta = directionMeta[key];
                  return (
                    <article
                      key={article.article_id}
                      className="rounded-2xl border border-slate-200 bg-white/72 p-4 transition-colors hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-medium leading-6 text-slate-950 sm:text-base">
                          <Link href={`/news/${article.article_id}`} className="hover:text-[#2F6BFF]">
                            {article.title}
                          </Link>
                        </h3>
                        <span className={`rounded-md border px-2 py-1 text-xs ${meta.textClass} ${meta.bgClass}`}>
                          {meta.symbol} {meta.label}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{article.source_name ?? "未知来源"}</span>
                        <span aria-hidden="true">•</span>
                        <time dateTime={article.published_at}>{formatDateTime(article.published_at)}</time>
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
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
          <StockPriceLineChart
            prices={stock?.prices ?? []}
            title="Price curve"
            subtitle={stock ? `${stock.ticker} · ${priceWindowLabel}` : "Price history"}
            labelCount={6}
          />

          <div className="space-y-6">
            {stock ? (
              currentUser ? (
                <PriceAlertForm stockId={stock.id} ticker={stock.ticker} />
              ) : (
                <LoginRequiredCard title="登录后创建价格告警" description="登录后可为当前股票设置高于/低于阈值的价格告警。" />
              )
            ) : null}

            <StockSyncStatusPanel title="行情刷新状态" compact />

            <article className="content-panel-strong p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="eyebrow-label">Price tape</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-950">最近价格明细</h2>
                </div>
                <span className="text-xs text-slate-500">近 {stock?.prices.length ?? 0} 个交易日</span>
              </div>
              {(stock?.prices.length ?? 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
                  当前没有可展示的价格数据。
                </div>
              ) : (
                <div className="space-y-3">
                  {stock?.prices.map((price) => {
                    const dayChange =
                      price.open !== null && price.close !== null ? Number((price.close - price.open).toFixed(2)) : null;
                    const dayDirection = dayChange === null ? "neutral" : dayChange >= 0 ? "bullish" : "bearish";
                    const meta = directionMeta[dayDirection];

                    return (
                      <article key={price.time} className="rounded-2xl border border-slate-200 bg-white/80 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-950">{formatPriceDate(price.time)}</p>
                            <p className="mt-1 text-xs text-slate-500">OHLC + volume snapshot</p>
                          </div>
                          <span className={`rounded-md border px-2 py-1 text-[11px] ${meta.textClass} ${meta.bgClass}`}>
                            {meta.symbol} {dayChange === null ? "--" : `${dayChange > 0 ? "+" : ""}${dayChange.toFixed(2)}`}
                          </span>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-700">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">开盘</span>
                            <span className="tabular-nums text-slate-950">{price.open?.toFixed(2) ?? "--"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">收盘</span>
                            <span className="tabular-nums text-slate-950">{price.close?.toFixed(2) ?? "--"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">最高</span>
                            <span className="tabular-nums text-slate-950">{price.high?.toFixed(2) ?? "--"}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-slate-500">最低</span>
                            <span className="tabular-nums text-slate-950">{price.low?.toFixed(2) ?? "--"}</span>
                          </div>
                          <div className="col-span-2 flex items-center justify-between gap-3">
                            <span className="text-slate-500">成交量</span>
                            <span className="tabular-nums text-slate-950">{price.volume?.toLocaleString("en-US") ?? "--"}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
