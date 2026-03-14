import Link from "next/link";

import { ManualStockSyncButton } from "@/components/manual-stock-sync-button";
import { StockPriceLineChart } from "@/components/stock-price-line-chart";
import { WatchlistToggleButton } from "@/components/watchlist-toggle-button";
import { fetchCurrentUser, isUnauthorizedError } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import type { ApiResponse } from "@/types/api";
import type { StockDetail, StockSnapshot, StockSyncStatus, WatchlistItem } from "@/types/stocks";

interface StockListItem {
  id: number;
  ticker: string;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  country: string | null;
  market_cap: number | null;
  snapshot: StockSnapshot;
}

interface StocksPageProps {
  searchParams?: Promise<{
    q?: string;
    page?: string;
  }>;
}

interface StocksPageData {
  response: ApiResponse<StockListItem[]>;
  hasError: boolean;
}

interface StockSyncStatusData {
  data: StockSyncStatus;
  hasError: boolean;
}

interface StockCardData extends StockListItem {
  prices: StockDetail["prices"];
  impactSummary: StockDetail["impact_summary"] | null;
  inWatchlist: boolean;
}

const PAGE_SIZE = 12;

function resolvePage(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return 1;
  }
  return parsed;
}

function normalizeQuery(value: string | undefined): string {
  return value?.trim() ?? "";
}

async function fetchStocksData(query: { q?: string; page: number; size: number }): Promise<StocksPageData> {
  try {
    const response = await apiGet<StockListItem[]>("/api/v1/stocks", {
      q: query.q,
      page: query.page,
      size: query.size
    });
    return { response, hasError: false };
  } catch {
    return {
      response: {
        status: "error",
        data: [],
        meta: {
          page: query.page,
          size: query.size,
          total: 0,
          timestamp: new Date().toISOString()
        }
      },
      hasError: true
    } as StocksPageData;
  }
}

async function enrichStockCards(stocks: StockListItem[]): Promise<StockCardData[]> {
  const watchlistIds = new Set((await fetchWatchlist()).map((item) => item.stock_id));
  const cards = await Promise.all(
    stocks.map(async (stock) => {
      try {
        const response = await apiGet<StockDetail>(`/api/v1/stocks/${stock.id}`, {
          window_hours: 240,
          price_points: 5,
          related_articles: 5
        });

        return {
          ...stock,
          prices: response.data.prices,
          impactSummary: response.data.impact_summary,
          inWatchlist: watchlistIds.has(stock.id)
        } satisfies StockCardData;
      } catch {
        return {
          ...stock,
          prices: [],
          impactSummary: null,
          inWatchlist: watchlistIds.has(stock.id)
        } satisfies StockCardData;
      }
    })
  );

  return cards;
}

async function fetchWatchlist(): Promise<WatchlistItem[]> {
  try {
    const response = await apiGet<WatchlistItem[]>("/api/v1/watchlist");
    return response.data;
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return [];
    }
    return [];
  }
}

async function fetchStockSyncStatus(): Promise<StockSyncStatusData> {
  try {
    const response = await apiGet<StockSyncStatus>("/api/v1/stocks/sync-status");
    return { data: response.data, hasError: false };
  } catch {
    return {
      data: {
        enabled: false,
        running: false,
        provider_name: null,
        last_started_at: null,
        last_finished_at: null,
        last_succeeded_at: null,
        last_error: null,
        tickers_requested: 0,
        tickers_succeeded: 0,
        tickers_failed: 0,
        price_points_fetched: 0,
        inserted: 0,
        updated: 0,
        updated_at: new Date().toISOString()
      },
      hasError: true
    };
  }
}

function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatSignedNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatMarketCap(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  }
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  return value.toLocaleString("en-US");
}

function buildStocksHref(params: { q: string; page: number }): string {
  const query = new URLSearchParams();
  if (params.q) {
    query.set("q", params.q);
  }
  query.set("page", String(params.page));
  return `/stocks?${query.toString()}`;
}

function formatShortDate(isoString: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(isoString));
}

function formatDateTime(isoString: string | null): string {
  if (!isoString) {
    return "--";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(isoString));
}

function getSyncBadge(syncStatus: StockSyncStatus): { label: string; className: string } {
  if (!syncStatus.enabled) {
    return {
      label: "未启用",
      className: "border-[#475569] bg-[#1E293B] text-[#CBD5E1]"
    };
  }

  if (syncStatus.running) {
    return {
      label: "同步中",
      className: "border-[#2563EB]/40 bg-[#2563EB]/15 text-[#93C5FD]"
    };
  }

  if (syncStatus.last_error) {
    return {
      label: "最近失败",
      className: "border-[#EF4444]/40 bg-[#EF4444]/15 text-[#FCA5A5]"
    };
  }

  if (syncStatus.last_succeeded_at) {
    return {
      label: "最近成功",
      className: "border-[#10B981]/40 bg-[#10B981]/15 text-[#6EE7B7]"
    };
  }

  return {
    label: "等待首次同步",
    className: "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#FCD34D]"
  };
}

export default async function StocksPage({ searchParams }: StocksPageProps): Promise<JSX.Element> {
  const currentUser = await fetchCurrentUser();
  const resolvedSearchParams = await searchParams;
  const q = normalizeQuery(resolvedSearchParams?.q);
  const page = resolvePage(resolvedSearchParams?.page);
  const { response, hasError } = await fetchStocksData({ q: q || undefined, page, size: PAGE_SIZE });
  const { data: syncStatus, hasError: syncStatusError } = await fetchStockSyncStatus();
  const stocks = response.data;
  const cards = await enrichStockCards(stocks);
  const total = Number(response.meta?.total ?? stocks.length);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;
  const syncBadge = getSyncBadge(syncStatus);

  return (
    <main className="page-shell">
      <section className="page-container space-y-6">
        <header className="page-hero p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow-label">Market coverage</p>
              <h1 className="text-2xl font-semibold sm:text-3xl">股票检索</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">按 `ticker` 或公司名称检索股票，并直接进入个股分析页。</p>
            </div>
            <div className="text-sm text-slate-500">
              <p>结果数</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">{total}</p>
            </div>
          </div>
          {hasError ? (
            <p className="mt-3 rounded-md border border-[#EF4444]/35 bg-[#EF444415] px-3 py-2 text-xs text-[#FCA5A5]">
              股票数据请求失败，当前显示为空结果。
            </p>
          ) : null}
          <div className="content-panel mt-4 grid gap-3 p-4 md:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-medium text-slate-950">行情同步状态</h2>
                <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${syncBadge.className}`}>
                  {syncBadge.label}
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Provider：{syncStatus.provider_name ?? "--"} · 最近成功：{formatDateTime(syncStatus.last_succeeded_at)}
              </p>
              {syncStatus.last_error ? (
                <p className="text-xs text-[#FCA5A5]">最近错误：{syncStatus.last_error}</p>
              ) : syncStatusError ? (
                <p className="text-xs text-[#FBBF24]">状态接口暂不可用，页面仍可继续浏览股票数据。</p>
              ) : null}
            </div>
            <div className="md:justify-self-end">
              <ManualStockSyncButton />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] text-slate-500">请求股票数</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{syncStatus.tickers_requested}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] text-slate-500">成功 / 失败</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
                {syncStatus.tickers_succeeded} / {syncStatus.tickers_failed}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white/95 p-3">
              <p className="text-[11px] text-slate-500">写入 / 更新</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
                {syncStatus.inserted} / {syncStatus.updated}
              </p>
            </div>
          </div>
          <form action="/stocks" className="mt-5 flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="输入 ticker 或公司名，如 AAPL / NVIDIA"
              className="input-surface h-11 flex-1 rounded-xl px-3 text-sm"
            />
            <input type="hidden" name="page" value="1" />
            <button type="submit" className="button-primary h-11 rounded-xl px-4 text-sm font-medium">
              搜索股票
            </button>
            <Link href="/stocks" className="button-secondary inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm">
              重置
            </Link>
          </form>
        </header>

        {cards.length === 0 ? (
          <section className="content-panel-strong p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-950">暂无股票结果</h2>
            <p className="mt-2 text-sm text-slate-600">可尝试搜索 `AAPL`、`NVDA` 等种子股票。</p>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((stock) => {
              const changePercent = stock.snapshot.change_percent;
              const directionClass =
                changePercent === null
                  ? "text-amber-300"
                  : changePercent >= 0
                    ? "text-emerald-400"
                    : "text-red-400";
              const maxClose = Math.max(...stock.prices.map((item) => item.close ?? 0), 0);
              const minClose = stock.prices.length > 0 ? Math.min(...stock.prices.map((item) => item.close ?? Number.MAX_SAFE_INTEGER)) : null;

              return (
                <article key={stock.id} className="data-panel p-5 transition-colors hover:border-slate-500/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/analysis/${stock.id}`} className="text-lg font-semibold text-white hover:text-sky-300">
                        {stock.ticker}
                      </Link>
                      <p className="mt-1 text-sm text-slate-300">{stock.name ?? "未命名股票"}</p>
                    </div>
                    <span className={`rounded-xl bg-slate-900/60 px-2 py-1 text-xs tabular-nums ${directionClass}`}>
                      {formatSignedPercent(changePercent)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="data-subpanel px-3 py-2">
                      <p className="text-slate-400">最新价</p>
                      <p className="mt-1 text-base font-semibold tabular-nums text-white">
                        {stock.snapshot.latest_close !== null ? stock.snapshot.latest_close.toFixed(2) : "--"}
                      </p>
                    </div>
                    <div className="data-subpanel px-3 py-2">
                      <p className="text-slate-400">日内变化</p>
                      <p className={`mt-1 text-base font-semibold tabular-nums ${directionClass}`}>
                        {formatSignedNumber(stock.snapshot.change)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-[#1E293B] bg-[#111827] p-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs text-[#94A3B8]">近 5 日收盘走势</p>
                      <p className="text-[11px] text-[#64748B]">更新：{formatDateTime(stock.snapshot.last_updated_at)}</p>
                    </div>
                    {stock.prices.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[#1E293B] px-3 py-6 text-center text-xs text-[#64748B]">
                        暂无走势数据
                      </div>
                    ) : (
                      <>
                        <StockPriceLineChart prices={stock.prices} height={160} showLabels={false} />
                        <div className="mt-3 grid grid-cols-5 gap-2 text-[11px] text-[#94A3B8]">
                          {stock.prices.map((price) => (
                            <div key={price.time} className="text-center">
                              <p>{formatShortDate(price.time)}</p>
                              <p className="mt-1 tabular-nums text-[#CBD5E1]">
                                {price.close !== null ? price.close.toFixed(2) : "--"}
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 flex items-center justify-between text-[11px] text-[#94A3B8]">
                          <span>区间低点：{minClose !== null && Number.isFinite(minClose) ? minClose.toFixed(2) : "--"}</span>
                          <span>区间高点：{maxClose > 0 ? maxClose.toFixed(2) : "--"}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-[#94A3B8]">
                    <div className="flex items-center justify-between gap-3">
                      <span>交易所</span>
                      <span className="text-[#CBD5E1]">{stock.exchange ?? "--"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>行业</span>
                      <span className="text-right text-[#CBD5E1]">{stock.industry ?? stock.sector ?? "--"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>国家</span>
                      <span className="text-[#CBD5E1]">{stock.country ?? "--"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>市值</span>
                      <span className="text-[#CBD5E1]">{formatMarketCap(stock.market_cap)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>信号方向</span>
                      <span className="text-[#CBD5E1]">{stock.impactSummary?.overall_direction ?? "--"}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Link
                      href={`/analysis/${stock.id}`}
                      className="button-primary inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium"
                    >
                      查看分析
                    </Link>
                    {currentUser ? (
                      <WatchlistToggleButton stockId={stock.id} initialInWatchlist={stock.inWatchlist} />
                    ) : (
                      <Link
                        href="/login"
                        className="button-dark inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm"
                      >
                        登录后自选
                      </Link>
                    )}
                    <Link
                      href="/market"
                      className="button-dark inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm"
                    >
                      市场页
                    </Link>
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <nav aria-label="stocks pagination" className="flex items-center justify-between">
          {hasPrevPage ? (
            <Link
              href={buildStocksHref({ q, page: page - 1 })}
              className="button-secondary rounded-xl px-4 py-2 text-sm"
            >
              上一页
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-400">上一页</span>
          )}
          <span className="text-sm text-slate-500">
            第 {page} 页 · 共 {totalPages} 页
          </span>
          {hasNextPage ? (
            <Link
              href={buildStocksHref({ q, page: page + 1 })}
              className="button-secondary rounded-xl px-4 py-2 text-sm"
            >
              下一页
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-400">下一页</span>
          )}
        </nav>
      </section>
    </main>
  );
}
