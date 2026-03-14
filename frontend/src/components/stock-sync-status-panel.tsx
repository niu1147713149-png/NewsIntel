import { ManualStockSyncButton } from "@/components/manual-stock-sync-button";
import { apiGet } from "@/lib/api";
import type { StockSyncStatus } from "@/types/stocks";

interface StockSyncStatusPanelProps {
  title?: string;
  compact?: boolean;
  showManualTrigger?: boolean;
}

interface StockSyncStatusResult {
  data: StockSyncStatus;
  hasError: boolean;
}

const FALLBACK_SYNC_STATUS: StockSyncStatus = {
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
};

async function fetchStockSyncStatus(): Promise<StockSyncStatusResult> {
  try {
    const response = await apiGet<StockSyncStatus>("/api/v1/stocks/sync-status");
    return { data: response.data, hasError: false };
  } catch {
    return { data: FALLBACK_SYNC_STATUS, hasError: true };
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

export async function StockSyncStatusPanel({
  title = "行情同步状态",
  compact = false,
  showManualTrigger = true
}: StockSyncStatusPanelProps): Promise<JSX.Element> {
  const { data: syncStatus, hasError } = await fetchStockSyncStatus();
  const syncBadge = getSyncBadge(syncStatus);

  return (
    <section className="data-panel p-5">
      <div className={`flex ${compact ? "flex-col gap-3" : "flex-wrap items-start justify-between gap-4"}`}>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${syncBadge.className}`}>
              {syncBadge.label}
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Provider: {syncStatus.provider_name ?? "--"} · 最近成功: {formatDateTime(syncStatus.last_succeeded_at)}
          </p>
          {syncStatus.last_error ? (
            <p className="text-xs text-[#FCA5A5]">最近错误: {syncStatus.last_error}</p>
          ) : hasError ? (
            <p className="text-xs text-[#FBBF24]">同步状态接口暂不可用，但页面仍可继续浏览。</p>
          ) : null}
        </div>
        {showManualTrigger ? <ManualStockSyncButton /> : null}
      </div>

      {!compact ? (
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="data-subpanel p-3">
            <p className="text-[11px] text-slate-400">请求股票数</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">{syncStatus.tickers_requested}</p>
          </div>
          <div className="data-subpanel p-3">
            <p className="text-[11px] text-slate-400">成功 / 失败</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">
              {syncStatus.tickers_succeeded} / {syncStatus.tickers_failed}
            </p>
          </div>
          <div className="data-subpanel p-3">
            <p className="text-[11px] text-slate-400">抓取价格点</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">{syncStatus.price_points_fetched}</p>
          </div>
          <div className="data-subpanel p-3">
            <p className="text-[11px] text-slate-400">写入 / 更新</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-white">
              {syncStatus.inserted} / {syncStatus.updated}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
