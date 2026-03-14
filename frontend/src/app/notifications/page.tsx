import Link from "next/link";

import { LoginRequiredCard } from "@/components/login-required-card";
import { NotificationGroups } from "@/components/notification-groups";
import { NotificationsReadAllButton } from "@/components/notifications-read-all-button";
import { NotificationsReadFilteredButton } from "@/components/notifications-read-filtered-button";
import { StockSyncStatusPanel } from "@/components/stock-sync-status-panel";
import { isUnauthorizedError } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import type { PriceAlertItem } from "@/types/stocks";

type NotificationScope = "all" | "unread";
type NotificationSort = "newest" | "oldest";

async function fetchNotifications(
  scope: NotificationScope,
  ticker?: string,
  sort: NotificationSort = "newest"
): Promise<{ notifications: PriceAlertItem[]; hasError: boolean; requiresAuth: boolean }> {
  try {
    const response = await apiGet<PriceAlertItem[]>("/api/v1/alerts/notifications", { scope, ticker, sort });
    return { notifications: response.data, hasError: false, requiresAuth: false };
  } catch (error) {
    return { notifications: [], hasError: !isUnauthorizedError(error), requiresAuth: isUnauthorizedError(error) };
  }
}

function buildNotificationsHref(params: { scope: NotificationScope; ticker?: string; sort?: NotificationSort }): string {
  const query = new URLSearchParams();
  query.set("scope", params.scope);
  if (params.ticker?.trim()) {
    query.set("ticker", params.ticker.trim().toUpperCase());
  }
  if (params.sort) {
    query.set("sort", params.sort);
  }
  return `/notifications?${query.toString()}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "--";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function getNotificationSummary(notifications: PriceAlertItem[]): {
  latestTriggeredAt: string | null;
  readRate: number;
  topTickers: Array<{ ticker: string; count: number }>;
  latestSnapshotAt: string | null;
} {
  const latestTriggeredAt = notifications.reduce<string | null>((latest, item) => {
    if (!item.triggered_at) return latest;
    if (!latest) return item.triggered_at;
    return new Date(item.triggered_at).getTime() > new Date(latest).getTime() ? item.triggered_at : latest;
  }, null);
  const latestSnapshotAt = notifications.reduce<string | null>((latest, item) => {
    const snapshotTime = item.snapshot.last_updated_at;
    if (!snapshotTime) return latest;
    if (!latest) return snapshotTime;
    return new Date(snapshotTime).getTime() > new Date(latest).getTime() ? snapshotTime : latest;
  }, null);

  const readCount = notifications.filter((item) => item.is_read).length;
  const readRate = notifications.length > 0 ? Math.round((readCount / notifications.length) * 100) : 0;

  const tickerCounts = new Map<string, number>();
  for (const item of notifications) {
    tickerCounts.set(item.ticker, (tickerCounts.get(item.ticker) ?? 0) + 1);
  }

  const topTickers = [...tickerCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 3)
    .map(([ticker, count]) => ({ ticker, count }));

  return { latestTriggeredAt, readRate, topTickers, latestSnapshotAt };
}

function groupNotificationsByTicker(notifications: PriceAlertItem[]): Array<{
  ticker: string;
  stockName: string | null;
  totalCount: number;
  unreadCount: number;
  latestTriggeredAt: string | null;
  latestItem: PriceAlertItem | null;
  items: PriceAlertItem[];
}> {
  const groups = new Map<
    string,
    {
      ticker: string;
      stockName: string | null;
      totalCount: number;
      unreadCount: number;
      latestTriggeredAt: string | null;
      latestItem: PriceAlertItem | null;
      items: PriceAlertItem[];
    }
  >();

  for (const notification of notifications) {
    const existing = groups.get(notification.ticker) ?? {
      ticker: notification.ticker,
      stockName: notification.stock_name,
      totalCount: 0,
      unreadCount: 0,
      latestTriggeredAt: null,
      latestItem: null,
      items: []
    };

    existing.totalCount += 1;
    existing.unreadCount += notification.is_read ? 0 : 1;
    if (
      notification.triggered_at &&
      (!existing.latestTriggeredAt ||
        new Date(notification.triggered_at).getTime() > new Date(existing.latestTriggeredAt).getTime())
    ) {
      existing.latestTriggeredAt = notification.triggered_at;
      existing.latestItem = notification;
    }
    if (!existing.latestItem) {
      existing.latestItem = notification;
    }
    existing.items.push(notification);
    groups.set(notification.ticker, existing);
  }

  return [...groups.values()].sort((left, right) => {
    if (left.unreadCount !== right.unreadCount) {
      return right.unreadCount - left.unreadCount;
    }
    const leftTime = left.latestTriggeredAt ? new Date(left.latestTriggeredAt).getTime() : 0;
    const rightTime = right.latestTriggeredAt ? new Date(right.latestTriggeredAt).getTime() : 0;
    return rightTime - leftTime || left.ticker.localeCompare(right.ticker);
  });
}

export default async function NotificationsPage({
  searchParams
}: {
  searchParams?: Promise<{ scope?: string; ticker?: string; sort?: string }>;
}): Promise<JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const scope: NotificationScope = resolvedSearchParams?.scope === "unread" ? "unread" : "all";
  const ticker = resolvedSearchParams?.ticker?.trim() ?? "";
  const sort: NotificationSort = resolvedSearchParams?.sort === "oldest" ? "oldest" : "newest";
  const { notifications, hasError, requiresAuth } = await fetchNotifications(scope, ticker || undefined, sort);
  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const summary = getNotificationSummary(notifications);
  const notificationGroups = groupNotificationsByTicker(notifications);

  return (
    <main className="page-shell">
      <section className="page-container space-y-6">
        <header className="page-hero p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow-label">Inbox</p>
              <h1 className="text-2xl font-semibold sm:text-3xl">通知中心</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">这里汇总已经触发的价格告警通知，并支持筛选、分组和批量处理。</p>
            </div>
            <div className="text-sm text-slate-500">
              <p>未读通知</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-950">{unreadCount}</p>
            </div>
          </div>
          {hasError ? (
            <p className="mt-3 rounded-md border border-[#EF4444]/35 bg-[#EF444415] px-3 py-2 text-xs text-[#FCA5A5]">
              通知请求失败，请稍后重试。
            </p>
          ) : null}
        </header>

        {requiresAuth ? (
          <LoginRequiredCard title="登录后查看通知中心" description="登录后可查看你的价格告警通知，并将其标记为已读。" />
        ) : notifications.length === 0 ? (
          <section className="content-panel-strong p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-950">暂无通知</h2>
            <p className="mt-2 text-sm text-slate-600">当价格告警被触发后，这里会显示对应通知。</p>
            <div className="mt-5 flex justify-center gap-3">
              <Link href="/alerts" className="button-primary rounded-xl px-4 py-2 text-sm font-medium">
                查看告警
              </Link>
              <Link href="/analysis/1" className="button-secondary rounded-xl px-4 py-2 text-sm font-medium">
                去创建告警
              </Link>
            </div>
          </section>
        ) : (
          <>
            <StockSyncStatusPanel title="通知依赖的行情状态" />
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <article className="content-panel p-4">
                <p className="text-xs text-slate-500">当前结果</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{notifications.length}</p>
                <p className="mt-1 text-xs text-slate-500">已应用当前筛选与排序</p>
              </article>
              <article className="content-panel p-4">
                <p className="text-xs text-slate-500">已读占比</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{summary.readRate}%</p>
                <p className="mt-1 text-xs text-slate-500">未读 {unreadCount} 条</p>
              </article>
              <article className="content-panel p-4">
                <p className="text-xs text-slate-500">最新触发</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{formatDateTime(summary.latestTriggeredAt)}</p>
                <p className="mt-1 text-xs text-slate-500">按告警触发时间汇总</p>
              </article>
              <article className="content-panel p-4">
                <p className="text-xs text-slate-500">最新行情快照</p>
                <p className="mt-2 text-sm font-semibold text-slate-950">{formatDateTime(summary.latestSnapshotAt)}</p>
                <p className="mt-1 text-xs text-slate-500">通知内可见的最新价格更新时间</p>
              </article>
            </section>
            <section className="content-panel p-4">
              <p className="text-xs text-slate-500">高频 ticker</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {summary.topTickers.length > 0 ? summary.topTickers.map((item) => `${item.ticker} ×${item.count}`).join(" · ") : "--"}
              </p>
              <p className="mt-1 text-xs text-slate-500">Top 3 触发集中度</p>
            </section>
            <section className="content-panel p-4">
              <p className="text-xs text-slate-500">继续处理</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/alerts" className="button-secondary rounded-xl px-3 py-2 text-sm">
                  返回告警页
                </Link>
                <Link href="/alerts" className="button-primary rounded-xl px-3 py-2 text-sm">
                  继续评估告警
                </Link>
              </div>
              <p className="mt-2 text-xs text-slate-500">回到告警总览继续触发评估或管理阈值。</p>
            </section>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <Link
                  href={buildNotificationsHref({ scope: "all", ticker, sort })}
                  className={`rounded-xl px-3 py-2 text-sm ${scope === "all" ? "button-primary" : "button-secondary"}`}
                >
                  全部
                </Link>
                <Link
                  href={buildNotificationsHref({ scope: "unread", ticker, sort })}
                  className={`rounded-xl px-3 py-2 text-sm ${scope === "unread" ? "button-primary" : "button-secondary"}`}
                >
                  未读
                </Link>
                <Link
                  href={buildNotificationsHref({ scope, ticker, sort: "newest" })}
                  className={`rounded-xl px-3 py-2 text-sm ${sort === "newest" ? "button-primary" : "button-secondary"}`}
                >
                  最新优先
                </Link>
                <Link
                  href={buildNotificationsHref({ scope, ticker, sort: "oldest" })}
                  className={`rounded-xl px-3 py-2 text-sm ${sort === "oldest" ? "button-primary" : "button-secondary"}`}
                >
                  最早优先
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <form action="/notifications" className="flex items-center gap-2">
                  <input type="hidden" name="scope" value={scope} />
                  <input type="hidden" name="sort" value={sort} />
                  <input
                    type="text"
                    name="ticker"
                    defaultValue={ticker}
                    placeholder="按 ticker 筛选"
                    className="input-surface h-10 rounded-xl px-3 text-sm"
                  />
                  <button type="submit" className="button-secondary rounded-xl px-3 py-2 text-sm">
                    筛选
                  </button>
                  {ticker ? (
                    <Link href={buildNotificationsHref({ scope, sort })} className="button-secondary rounded-xl px-3 py-2 text-sm">
                      清除
                    </Link>
                  ) : null}
                </form>
                <NotificationsReadFilteredButton scope={scope} sort={sort} ticker={ticker || undefined} />
                <NotificationsReadAllButton />
              </div>
            </div>
            <NotificationGroups groups={notificationGroups} scope={scope} sort={sort} />
          </>
        )}
      </section>
    </main>
  );
}
