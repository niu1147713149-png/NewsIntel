"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { NotificationReadButton } from "@/components/notification-read-button";
import { NotificationsReadTickerButton } from "@/components/notifications-read-ticker-button";
import type { PriceAlertItem } from "@/types/stocks";

interface NotificationGroup {
  ticker: string;
  stockName: string | null;
  totalCount: number;
  unreadCount: number;
  latestTriggeredAt: string | null;
  latestItem: PriceAlertItem | null;
  items: PriceAlertItem[];
}

interface NotificationGroupsProps {
  groups: NotificationGroup[];
  scope: "all" | "unread";
  sort: "newest" | "oldest";
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

function getFreshnessMeta(value: string | null): { label: string; className: string } {
  if (!value) {
    return {
      label: "暂无价格快照",
      className: "border-[#475569] bg-[#1E293B] text-[#CBD5E1]"
    };
  }

  const ageHours = (Date.now() - new Date(value).getTime()) / (1000 * 60 * 60);
  if (ageHours <= 24) {
    return {
      label: "快照较新",
      className: "border-[#10B981]/40 bg-[#10B981]/15 text-[#6EE7B7]"
    };
  }

  if (ageHours <= 72) {
    return {
      label: "建议刷新关注",
      className: "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#FCD34D]"
    };
  }

  return {
    label: "快照偏旧",
    className: "border-[#EF4444]/40 bg-[#EF4444]/15 text-[#FCA5A5]"
  };
}

function buildNotificationsHref(params: { scope: "all" | "unread"; ticker?: string; sort?: "newest" | "oldest" }): string {
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

export function NotificationGroups({ groups, scope, sort }: NotificationGroupsProps): JSX.Element {
  const defaultExpanded = useMemo(
    () => new Set(groups.filter((group, index) => index === 0 || group.unreadCount > 0).map((group) => group.ticker)),
    [groups]
  );
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(defaultExpanded);

  function toggleTicker(ticker: string): void {
    setExpandedTickers((current) => {
      const next = new Set(current);
      if (next.has(ticker)) {
        next.delete(ticker);
      } else {
        next.add(ticker);
      }
      return next;
    });
  }

  return (
    <section className="space-y-5">
      {groups.map((group) => {
        const isExpanded = expandedTickers.has(group.ticker);
        const groupSnapshotTime = group.latestItem?.snapshot.last_updated_at ?? null;
        const freshness = getFreshnessMeta(groupSnapshotTime);

        return (
          <section key={group.ticker} className="data-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-700/60 pb-4">
              <button type="button" onClick={() => toggleTicker(group.ticker)} className="cursor-pointer text-left">
                <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{group.ticker}</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{group.stockName ?? "未命名股票"}</h2>
                <p className="mt-1 text-sm text-slate-300">最近触发：{formatDateTime(group.latestTriggeredAt)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2 py-1 text-[11px] ${freshness.className}`}>{freshness.label}</span>
                  <span className="text-xs text-slate-300">对应价格时间 {formatDateTime(groupSnapshotTime)}</span>
                </div>
                {group.latestItem ? (
                  <p className="mt-2 text-sm text-slate-200">
                    最新一条：价格{group.latestItem.operator === "above" ? "高于" : "低于"} {group.latestItem.threshold.toFixed(2)}，触发价{" "}
                    {group.latestItem.triggered_price?.toFixed(2) ?? "--"}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-sky-300">{isExpanded ? "收起分组" : "展开分组"}</p>
              </button>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-slate-600 bg-slate-900/50 px-3 py-1 text-slate-200">共 {group.totalCount} 条</span>
                <span
                  className={`rounded-full border px-3 py-1 ${
                    group.unreadCount > 0
                      ? "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#FCD34D]"
                      : "border-[#475569] bg-[#1E293B] text-[#CBD5E1]"
                  }`}
                >
                  未读 {group.unreadCount} 条
                </span>
                {group.unreadCount > 0 ? <NotificationsReadTickerButton ticker={group.ticker} /> : null}
                <Link
                  href={buildNotificationsHref({ scope, ticker: group.ticker, sort })}
                  className="button-dark rounded-full px-3 py-1"
                >
                  仅看 {group.ticker}
                </Link>
              </div>
            </div>
            {isExpanded ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {group.items.map((notification) => (
                  <article key={notification.alert_id} className="data-subpanel p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">{notification.ticker}</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{notification.stock_name ?? "未命名股票"}</h3>
                        <p className="mt-1 text-sm text-slate-300">
                          价格{notification.operator === "above" ? "高于" : "低于"} {notification.threshold.toFixed(2)}，触发价{" "}
                          {notification.triggered_price?.toFixed(2) ?? "--"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full border px-2 py-1 text-[11px] ${
                          notification.is_read
                            ? "border-[#475569] bg-[#1E293B] text-[#CBD5E1]"
                            : "border-[#F59E0B]/40 bg-[#F59E0B]/15 text-[#FCD34D]"
                        }`}
                      >
                        {notification.is_read ? "已读" : "未读"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span>触发时间：{formatDateTime(notification.triggered_at)}</span>
                      <span className="text-slate-500">·</span>
                      <span>价格快照：{formatDateTime(notification.snapshot.last_updated_at)}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-slate-300">
                      <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                        <p className="text-[11px] text-slate-400">最新价</p>
                        <p className="mt-1 text-slate-100">{notification.snapshot.latest_close?.toFixed(2) ?? "--"}</p>
                      </div>
                      <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                        <p className="text-[11px] text-slate-400">日内变化</p>
                        <p className="mt-1 text-slate-100">
                          {notification.snapshot.change !== null && Number.isFinite(notification.snapshot.change)
                            ? `${notification.snapshot.change > 0 ? "+" : ""}${notification.snapshot.change.toFixed(2)}`
                            : "--"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link href={`/analysis/${notification.stock_id}`} className="button-primary rounded-xl px-4 py-2 text-sm font-medium">
                        查看个股
                      </Link>
                      {!notification.is_read ? <NotificationReadButton alertId={notification.alert_id} /> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </section>
  );
}
