import Link from "next/link";

import { LiveNewsFeed } from "@/components/live-news-feed";
import { LoginRequiredCard } from "@/components/login-required-card";
import { RealtimeConnectionPanel } from "@/components/realtime-connection-panel";
import { StockSyncStatusPanel } from "@/components/stock-sync-status-panel";
import { WatchlistLiveBoard } from "@/components/watchlist-live-board";
import { WatchlistToggleButton } from "@/components/watchlist-toggle-button";
import { isUnauthorizedError } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import type { Article } from "@/types/news";
import type { WatchlistItem } from "@/types/stocks";

async function fetchWatchlist(): Promise<{ items: WatchlistItem[]; hasError: boolean; requiresAuth: boolean }> {
  try {
    const response = await apiGet<WatchlistItem[]>("/api/v1/watchlist");
    return { items: response.data, hasError: false, requiresAuth: false };
  } catch (error) {
    return { items: [], hasError: !isUnauthorizedError(error), requiresAuth: isUnauthorizedError(error) };
  }
}

async function fetchInitialLiveNews(): Promise<Article[]> {
  try {
    const response = await apiGet<Article[]>("/api/v1/news", { page: 1, size: 5 });
    return response.data;
  } catch {
    return [];
  }
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

function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getFreshnessMeta(isoString: string | null): { label: string; className: string } {
  if (!isoString) {
    return {
      label: "暂无价格更新",
      className: "border-[#475569] bg-[#1E293B] text-[#CBD5E1]"
    };
  }

  const ageHours = (Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60);
  if (ageHours <= 24) {
    return {
      label: "价格较新",
      className: "border-[#10B981]/40 bg-[#10B981]/15 text-[#6EE7B7]"
    };
  }

  if (ageHours <= 72) {
    return {
      label: "建议关注刷新",
      className: "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#FCD34D]"
    };
  }

  return {
    label: "价格偏旧",
    className: "border-[#EF4444]/40 bg-[#EF4444]/15 text-[#FCA5A5]"
  };
}

function getRealtimeEndpoint(path: string, transport: "http" | "ws"): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  if (transport === "http") {
    return `${apiBase}${path}`;
  }

  const configuredWsBase = process.env.NEXT_PUBLIC_WS_URL;
  if (configuredWsBase) {
    return `${configuredWsBase}${path}`;
  }

  const wsBase = apiBase.startsWith("https://") ? apiBase.replace("https://", "wss://") : apiBase.replace("http://", "ws://");
  return `${wsBase}${path}`;
}

function appendQueryParams(url: string, params: Record<string, string | undefined>): string {
  const nextUrl = new URL(url);

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      nextUrl.searchParams.set(key, value);
    }
  }

  return nextUrl.toString();
}

export default async function WatchlistPage(): Promise<JSX.Element> {
  const { items, hasError, requiresAuth } = await fetchWatchlist();
  const initialLiveNews = requiresAuth ? [] : await fetchInitialLiveNews();
  const watchlistStockIds = items.map((item) => String(item.stock_id)).join(",");

  return (
    <main className="page-shell">
      <section className="page-container space-y-6">
        <header className="page-hero p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow-label">Watchdesk</p>
              <h1 className="text-2xl font-semibold sm:text-3xl">自选股</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">当前以本地单用户模式保存，后续可平滑升级到账户体系。</p>
            </div>
            <div className="text-sm text-slate-500">
              <p>自选数量</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">{items.length}</p>
            </div>
          </div>
          {hasError ? (
            <p className="mt-3 rounded-md border border-[#EF4444]/35 bg-[#EF444415] px-3 py-2 text-xs text-[#FCA5A5]">
              自选股请求失败，请稍后重试。
            </p>
          ) : null}
        </header>

        {!requiresAuth ? <StockSyncStatusPanel title="观察列表行情状态" /> : null}

        {!requiresAuth ? (
          <section className="grid gap-4 xl:grid-cols-2">
            <RealtimeConnectionPanel
              title="自选股价格订阅"
              description="为 watchlist 的逐笔/增量价格更新预留 WebSocket 通道，后端连通后可直接在此验证连接状态。"
              transport="websocket"
              endpoint={appendQueryParams(getRealtimeEndpoint("/api/v1/ws/prices", "ws"), { stock_ids: watchlistStockIds || undefined })}
              autoConnect
            />
            <LiveNewsFeed endpoint={getRealtimeEndpoint("/api/v1/stream/news", "http")} initialArticles={initialLiveNews} />
          </section>
        ) : null}

        {!requiresAuth && items.length > 0 ? (
          <WatchlistLiveBoard
            endpoint={appendQueryParams(getRealtimeEndpoint("/api/v1/ws/prices", "ws"), { stock_ids: watchlistStockIds || undefined })}
            items={items}
          />
        ) : null}

        {requiresAuth ? (
          <LoginRequiredCard title="登录后查看自选股" description="登录后可在股票页和个股分析页保存你的自选股列表。" />
        ) : items.length === 0 ? (
          <section className="content-panel-strong p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-950">暂无自选股</h2>
            <p className="mt-2 text-sm text-slate-600">可前往股票页把关心的股票加入自选。</p>
            <div className="mt-5">
              <Link href="/stocks" className="button-primary inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium">
                去股票页
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => {
              const freshness = getFreshnessMeta(item.snapshot.last_updated_at);

              return (
                <article key={item.stock_id} className="data-panel p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{item.exchange ?? "MARKET"}</p>
                      <h2 className="mt-2 text-xl font-semibold text-white">{item.ticker}</h2>
                      <p className="mt-1 text-sm text-slate-300">{item.name ?? "未命名股票"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-400">最新价</p>
                      <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                        {item.snapshot.latest_close !== null ? item.snapshot.latest_close.toFixed(2) : "--"}
                      </p>
                      <p className="mt-1 text-sm text-slate-300">{formatSignedPercent(item.snapshot.change_percent)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${freshness.className}`}>
                      {freshness.label}
                    </span>
                    <span className="text-xs text-slate-300">最近价格时间 {formatDateTime(item.snapshot.last_updated_at)}</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                    <div className="data-subpanel p-3">
                      <p className="text-[11px] text-slate-400">加入时间</p>
                      <p className="mt-1 text-slate-100">{formatDateTime(item.added_at)}</p>
                    </div>
                    <div className="data-subpanel p-3">
                      <p className="text-[11px] text-slate-400">日内变化</p>
                      <p className="mt-1 text-slate-100">
                        {item.snapshot.change !== null && Number.isFinite(item.snapshot.change)
                          ? `${item.snapshot.change > 0 ? "+" : ""}${item.snapshot.change.toFixed(2)}`
                          : "--"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href={`/analysis/${item.stock_id}`}
                      className="button-primary inline-flex flex-1 items-center justify-center rounded-xl px-3 py-2 text-sm font-medium"
                    >
                      查看分析
                    </Link>
                    <Link
                      href="/stocks"
                      className="button-dark inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm"
                    >
                      股票页
                    </Link>
                    <WatchlistToggleButton stockId={item.stock_id} initialInWatchlist />
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}
