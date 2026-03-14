import Link from "next/link";

import { AlertDeleteButton } from "@/components/alert-delete-button";
import { AlertsEvaluateButton } from "@/components/alerts-evaluate-button";
import { LoginRequiredCard } from "@/components/login-required-card";
import { StockSyncStatusPanel } from "@/components/stock-sync-status-panel";
import { isUnauthorizedError } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import type { PriceAlertItem } from "@/types/stocks";

async function fetchAlerts(): Promise<{ alerts: PriceAlertItem[]; hasError: boolean; requiresAuth: boolean }> {
  try {
    const response = await apiGet<PriceAlertItem[]>("/api/v1/alerts");
    return { alerts: response.data, hasError: false, requiresAuth: false };
  } catch (error) {
    return { alerts: [], hasError: !isUnauthorizedError(error), requiresAuth: isUnauthorizedError(error) };
  }
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "--";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

export default async function AlertsPage(): Promise<JSX.Element> {
  const { alerts, hasError, requiresAuth } = await fetchAlerts();

  return (
    <main className="page-shell">
      <section className="page-container space-y-6">
        <header className="page-hero p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow-label">Alert control</p>
              <h1 className="text-2xl font-semibold sm:text-3xl">价格告警</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">当前支持基础阈值告警：价格高于 / 低于某个数值。</p>
            </div>
            {!requiresAuth ? <AlertsEvaluateButton /> : null}
          </div>
          {hasError ? (
            <p className="mt-3 rounded-md border border-[#EF4444]/35 bg-[#EF444415] px-3 py-2 text-xs text-[#FCA5A5]">
              告警数据请求失败，请稍后重试。
            </p>
          ) : null}
        </header>

        <StockSyncStatusPanel title="告警依赖的行情状态" />

        {requiresAuth ? (
          <LoginRequiredCard title="登录后查看价格告警" description="登录后可创建、查看并管理你的个股价格阈值告警。" />
        ) : alerts.length === 0 ? (
          <section className="content-panel-strong p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-950">暂无价格告警</h2>
            <p className="mt-2 text-sm text-slate-600">可前往个股分析页创建第一条价格阈值告警。</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/stocks" className="button-primary rounded-xl px-4 py-2 text-sm font-medium">
                去股票页
              </Link>
              <Link href="/analysis/1" className="button-secondary rounded-xl px-4 py-2 text-sm font-medium">
                去个股分析页
              </Link>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {alerts.map((alert) => (
              <article key={alert.alert_id} className="data-panel p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{alert.ticker}</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{alert.stock_name ?? "未命名股票"}</h2>
                    <p className="mt-1 text-sm text-slate-300">
                      条件：价格{alert.operator === "above" ? "高于" : "低于"} {alert.threshold.toFixed(2)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-1 text-[11px] ${
                      alert.is_active
                        ? "border-[#10B981]/40 bg-[#10B981]/15 text-[#6EE7B7]"
                        : "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#FCD34D]"
                    }`}
                  >
                    {alert.is_active ? "监控中" : "已触发"}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300">
                  <div className="data-subpanel p-3">
                    <p className="text-[11px] text-slate-400">当前价格</p>
                    <p className="mt-1 text-slate-100">{alert.snapshot.latest_close?.toFixed(2) ?? "--"}</p>
                  </div>
                  <div className="data-subpanel p-3">
                    <p className="text-[11px] text-slate-400">触发价格</p>
                    <p className="mt-1 text-slate-100">{alert.triggered_price?.toFixed(2) ?? "--"}</p>
                  </div>
                  <div className="data-subpanel p-3">
                    <p className="text-[11px] text-slate-400">创建时间</p>
                    <p className="mt-1 text-slate-100">{formatDateTime(alert.created_at)}</p>
                  </div>
                  <div className="data-subpanel p-3">
                    <p className="text-[11px] text-slate-400">触发时间</p>
                    <p className="mt-1 text-slate-100">{formatDateTime(alert.triggered_at)}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/analysis/${alert.stock_id}`} className="button-primary rounded-xl px-4 py-2 text-sm font-medium">
                    查看个股
                  </Link>
                  <AlertDeleteButton alertId={alert.alert_id} />
                </div>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  );
}
