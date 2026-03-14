"use client";

import { useEffect, useMemo, useState } from "react";

import { useWebSocket } from "@/hooks/use-websocket";
import type { StockSnapshot, WatchlistItem } from "@/types/stocks";

interface WatchlistLiveBoardProps {
  endpoint: string;
  items: WatchlistItem[];
}

interface PriceStreamPayload {
  event?: string;
  items?: Array<{
    id: number;
    ticker: string;
    snapshot: StockSnapshot;
  }>;
  tick?: number;
}

interface LiveEntry {
  stockId: number;
  ticker: string;
  snapshot: StockSnapshot;
  tick: number | null;
}

function formatSignedNumber(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}`;
}

function formatSignedPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }
  return `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function WatchlistLiveBoard({ endpoint, items }: WatchlistLiveBoardProps): JSX.Element {
  const websocket = useWebSocket({ url: endpoint, autoConnect: true });
  const [liveEntries, setLiveEntries] = useState<Record<number, LiveEntry>>({});

  useEffect(() => {
    if (!websocket.lastMessage) {
      return;
    }

    try {
      const payload = JSON.parse(websocket.lastMessage) as PriceStreamPayload;
      if (!payload.items?.length) {
        return;
      }

      setLiveEntries((current) => {
        const next = { ...current };
        for (const item of payload.items ?? []) {
          next[item.id] = {
            stockId: item.id,
            ticker: item.ticker,
            snapshot: item.snapshot,
            tick: payload.event === "price-update" ? (payload.tick ?? null) : null
          };
        }
        return next;
      });
    } catch {
      return;
    }
  }, [websocket.lastMessage]);

  const mergedItems = useMemo(() => {
    return items.map((item) => {
      const live = liveEntries[item.stock_id];
      return {
        stockId: item.stock_id,
        ticker: item.ticker,
        name: item.name,
        snapshot: live?.snapshot ?? item.snapshot,
        tick: live?.tick ?? null,
        isLive: Boolean(live)
      };
    });
  }, [items, liveEntries]);

  const statusText = useMemo(() => {
    if (websocket.status === "open") {
      return "实时价格已连接";
    }
    if (websocket.status === "connecting") {
      return "实时价格连接中";
    }
    if (websocket.status === "error") {
      return "实时价格暂时中断";
    }
    return "等待实时价格流";
  }, [websocket.status]);

  return (
    <section className="content-panel-strong p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow-label">Live watchlist</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">自选股实时看板</h2>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">{statusText}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">直接消费 watchlist scoped WebSocket 价格流，优先显示最近一帧更新结果。</p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {mergedItems.map((item) => (
          <article key={item.stockId} className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{item.ticker}</p>
                <h3 className="mt-2 text-base font-semibold text-slate-950">{item.name ?? "未命名股票"}</h3>
              </div>
              <span
                className={`rounded-full border px-2 py-1 text-[11px] font-medium ${
                  item.isLive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"
                }`}
              >
                {item.isLive ? `LIVE${item.tick ? ` · #${item.tick}` : ""}` : "STATIC"}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Latest</p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-slate-950">
                  {item.snapshot.latest_close !== null ? item.snapshot.latest_close.toFixed(2) : "--"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Change</p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-slate-950">{formatSignedNumber(item.snapshot.change)}</p>
                <p className="mt-1 text-[11px] text-slate-500">{formatSignedPercent(item.snapshot.change_percent)}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
