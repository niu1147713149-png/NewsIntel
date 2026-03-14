import Link from "next/link";

import { LoginRequiredCard } from "@/components/login-required-card";
import { ProfileEditForm } from "@/components/profile-edit-form";
import { fetchCurrentUser } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import type { PriceAlertItem, WatchlistItem } from "@/types/stocks";

async function fetchWatchlist(): Promise<WatchlistItem[]> {
  try {
    const response = await apiGet<WatchlistItem[]>("/api/v1/watchlist");
    return response.data;
  } catch {
    return [];
  }
}

async function fetchAlerts(): Promise<PriceAlertItem[]> {
  try {
    const response = await apiGet<PriceAlertItem[]>("/api/v1/alerts");
    return response.data;
  } catch {
    return [];
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

export default async function ProfilePage(): Promise<JSX.Element> {
  const currentUser = await fetchCurrentUser();

  if (!currentUser) {
    return (
        <main className="page-shell">
          <section className="page-container max-w-5xl">
            <LoginRequiredCard title="登录后查看个人中心" description="登录后可查看你的账户信息、自选股概览和价格告警摘要。" />
          </section>
        </main>
    );
  }

  const [watchlistItems, alerts] = await Promise.all([fetchWatchlist(), fetchAlerts()]);
  const watchlistCount = watchlistItems.length;
  const alertSummary = {
    total: alerts.length,
    active: alerts.filter((alert) => alert.is_active).length,
    triggered: alerts.filter((alert) => !alert.is_active).length
  };
  const recentWatchlistItems = [...watchlistItems]
    .sort((left, right) => new Date(right.added_at).getTime() - new Date(left.added_at).getTime())
    .slice(0, 3);
  const recentTriggeredAlerts = [...alerts]
    .filter((alert) => !alert.is_active)
    .sort((left, right) => {
      const leftTime = left.triggered_at ? new Date(left.triggered_at).getTime() : 0;
      const rightTime = right.triggered_at ? new Date(right.triggered_at).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 3);

  return (
    <main className="page-shell">
      <section className="page-container space-y-6">
        <header className="page-hero p-6">
          <p className="eyebrow-label">Account hub</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">个人中心</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">查看当前登录账户、自选股概览和价格告警状态。</p>
        </header>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <article className="content-panel-strong p-5">
            <p className="eyebrow-label">Identity</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">账户信息</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-slate-500">名称</span>
                <span>{currentUser.name ?? "未设置"}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-slate-500">邮箱</span>
                <span>{currentUser.email}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="text-slate-500">角色</span>
                <span>{currentUser.role}</span>
              </div>
            </div>
          </article>

          <article className="data-panel p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Workspace</p>
            <h2 className="mt-2 text-lg font-semibold text-white">功能概览</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="data-subpanel p-4">
                <p className="text-[11px] text-slate-400">自选股</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{watchlistCount}</p>
              </div>
              <div className="data-subpanel p-4">
                <p className="text-[11px] text-slate-400">活跃告警</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{alertSummary.active}</p>
              </div>
              <div className="data-subpanel p-4">
                <p className="text-[11px] text-slate-400">已触发告警</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-white">{alertSummary.triggered}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/watchlist" className="button-dark rounded-xl px-4 py-2 text-sm">
                查看自选股
              </Link>
              <Link href="/alerts" className="button-dark rounded-xl px-4 py-2 text-sm">
                查看告警
              </Link>
              <Link href="/profile/security" className="button-primary rounded-xl px-4 py-2 text-sm font-medium">
                修改密码
              </Link>
            </div>
          </article>
        </section>

        <ProfileEditForm initialName={currentUser.name} />

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <article className="content-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">最近加入的自选股</h2>
              <Link href="/watchlist" className="text-sm font-medium text-[#2F6BFF] hover:text-[#1E40AF]">
                查看全部
              </Link>
            </div>
            {recentWatchlistItems.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                暂无最近加入记录。
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentWatchlistItems.map((item) => (
                  <article key={item.stock_id} className="rounded-xl border border-slate-200 bg-white/95 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">{item.ticker}</p>
                        <p className="mt-1 text-xs text-slate-500">{item.name ?? "未命名股票"}</p>
                      </div>
                      <p className="text-xs text-slate-500">{formatDateTime(item.added_at)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                      <span>最新价：{item.snapshot.latest_close?.toFixed(2) ?? "--"}</span>
                      <Link href={`/analysis/${item.stock_id}`} className="font-medium text-[#2F6BFF] hover:text-[#1E40AF]">
                        查看个股
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>

          <article className="content-panel p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">最近触发的告警</h2>
              <Link href="/alerts" className="text-sm font-medium text-[#2F6BFF] hover:text-[#1E40AF]">
                查看全部
              </Link>
            </div>
            {recentTriggeredAlerts.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                暂无已触发告警。
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {recentTriggeredAlerts.map((alert) => (
                  <article key={alert.alert_id} className="rounded-xl border border-slate-200 bg-white/95 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {alert.ticker} · 价格{alert.operator === "above" ? "高于" : "低于"} {alert.threshold.toFixed(2)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">触发价格：{alert.triggered_price?.toFixed(2) ?? "--"}</p>
                      </div>
                      <p className="text-xs text-slate-500">{formatDateTime(alert.triggered_at)}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-end text-xs">
                      <Link href={`/analysis/${alert.stock_id}`} className="font-medium text-[#2F6BFF] hover:text-[#1E40AF]">
                        查看个股
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>
      </section>
    </main>
  );
}
