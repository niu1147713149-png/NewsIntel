import Link from "next/link";
import Image from "next/image";

import { LiveNewsFeed } from "@/components/live-news-feed";
import { ManualStockSyncButton } from "@/components/manual-stock-sync-button";
import { fetchCurrentUser } from "@/lib/auth";
import { apiGet } from "@/lib/api";
import { getArticleLabel, getArticleVisualAlt, getArticleVisualDataUri } from "@/lib/article-visual";
import type { ApiResponse } from "@/types/api";
import type { Article, SentimentLabel } from "@/types/news";
import type { PriceAlertItem, StockSyncStatus } from "@/types/stocks";

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

const SENTIMENT_META: Record<
  SentimentLabel,
  {
    label: string;
    textClass: string;
    bgClass: string;
    symbol: string;
  }
> = {
  positive: {
    label: "利好",
    textClass: "text-emerald-400",
    bgClass: "bg-emerald-400",
    symbol: "↑"
  },
  negative: {
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

interface DashboardData {
  response: ApiResponse<Article[]>;
  hasError: boolean;
}

interface DashboardSyncStatusData {
  data: StockSyncStatus;
  hasError: boolean;
}

interface DashboardAlertsData {
  alerts: PriceAlertItem[];
  hasError: boolean;
}

interface DashboardNotificationsData {
  notifications: PriceAlertItem[];
  hasError: boolean;
}

function getRealtimeHttpEndpoint(path: string): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${apiBase}${path}`;
}

function formatPublishedAt(isoString: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(isoString));
}

function getWidthClass(percent: number): (typeof WIDTH_CLASSES)[number] {
  const normalized = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const index = Math.round(normalized / (100 / (WIDTH_CLASSES.length - 1)));
  return WIDTH_CLASSES[index];
}

async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const response = await apiGet<Article[]>("/api/v1/news", { page: 1, size: 20 });
    return { response, hasError: false };
  } catch {
    return {
      response: {
        status: "error",
        data: [],
        meta: {
          page: 1,
          size: 20,
          total: 0,
          timestamp: new Date().toISOString()
        }
      },
      hasError: true
    };
  }
}

async function fetchStockSyncStatus(): Promise<DashboardSyncStatusData> {
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

async function fetchAlertsSummary(): Promise<DashboardAlertsData> {
  try {
    const response = await apiGet<PriceAlertItem[]>("/api/v1/alerts");
    return { alerts: response.data, hasError: false };
  } catch {
    return { alerts: [], hasError: true };
  }
}

async function fetchUnreadNotifications(): Promise<DashboardNotificationsData> {
  try {
    const response = await apiGet<PriceAlertItem[]>("/api/v1/alerts/notifications", { scope: "unread" });
    return { notifications: response.data, hasError: false };
  } catch {
    return { notifications: [], hasError: true };
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

function getUnreadNotificationsSummary(notifications: PriceAlertItem[]): {
  latestTriggeredAt: string | null;
  topTicker: string | null;
  topTickerCount: number;
} {
  const latestTriggeredAt = notifications.reduce<string | null>((latest, item) => {
    if (!item.triggered_at) return latest;
    if (!latest) return item.triggered_at;
    return new Date(item.triggered_at).getTime() > new Date(latest).getTime() ? item.triggered_at : latest;
  }, null);

  const tickerCounts = new Map<string, number>();
  for (const item of notifications) {
    tickerCounts.set(item.ticker, (tickerCounts.get(item.ticker) ?? 0) + 1);
  }

  const topTickerEntry = [...tickerCounts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];

  return {
    latestTriggeredAt,
    topTicker: topTickerEntry?.[0] ?? null,
    topTickerCount: topTickerEntry?.[1] ?? 0
  };
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

export default async function HomePage(): Promise<JSX.Element> {
  const currentUser = await fetchCurrentUser();
  const { response, hasError } = await fetchDashboardData();
  const { data: syncStatus, hasError: syncStatusError } = await fetchStockSyncStatus();
  const { alerts, hasError: alertsError } = await fetchAlertsSummary();
  const { notifications: unreadNotifications, hasError: notificationsError } = currentUser
    ? await fetchUnreadNotifications()
    : { notifications: [], hasError: false };
  const articles = response.data;
  const total = response.meta?.total ?? articles.length;
  const latestNews = articles.slice(0, 6);
  const featuredArticle = latestNews[0] ?? null;
  const sources = new Set(articles.map((article) => article.source_name).filter(Boolean)).size;
  const now = new Date();
  const todayCount = articles.filter((article) => {
    const publishedDate = new Date(article.published_at);
    return (
      publishedDate.getUTCFullYear() === now.getUTCFullYear() &&
      publishedDate.getUTCMonth() === now.getUTCMonth() &&
      publishedDate.getUTCDate() === now.getUTCDate()
    );
  }).length;

  const sentimentCounts: Record<SentimentLabel, number> = {
    positive: 0,
    negative: 0,
    neutral: 0
  };

  for (const article of articles) {
    if (article.sentiment) {
      sentimentCounts[article.sentiment.label] += 1;
    }
  }

  const sentimentTotal = sentimentCounts.positive + sentimentCounts.negative + sentimentCounts.neutral;
  const positiveRatio = sentimentTotal > 0 ? Math.round((sentimentCounts.positive / sentimentTotal) * 100) : 0;
  const sentimentEntries: Array<{ key: SentimentLabel; count: number; percent: number }> = [
    {
      key: "positive",
      count: sentimentCounts.positive,
      percent: sentimentTotal > 0 ? Math.round((sentimentCounts.positive / sentimentTotal) * 100) : 0
    },
    {
      key: "negative",
      count: sentimentCounts.negative,
      percent: sentimentTotal > 0 ? Math.round((sentimentCounts.negative / sentimentTotal) * 100) : 0
    },
    {
      key: "neutral",
      count: sentimentCounts.neutral,
      percent: sentimentTotal > 0 ? Math.round((sentimentCounts.neutral / sentimentTotal) * 100) : 0
    }
  ];
  const syncBadge = getSyncBadge(syncStatus);
  const activeAlerts = alerts.filter((alert) => alert.is_active);
  const triggeredAlerts = alerts.filter((alert) => !alert.is_active);
  const latestTriggeredAlerts = [...triggeredAlerts]
    .sort((left, right) => {
      const leftTime = left.triggered_at ? new Date(left.triggered_at).getTime() : 0;
      const rightTime = right.triggered_at ? new Date(right.triggered_at).getTime() : 0;
      return rightTime - leftTime;
    })
    .slice(0, 3);
  const unreadNotificationsSummary = getUnreadNotificationsSummary(unreadNotifications);

  return (
    <main className="page-shell">
      <section className="page-container space-y-6">
        <header className="page-hero overflow-hidden p-6 lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
            <div>
              <p className="eyebrow-label">Editorial signal desk</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl text-balance">
                用更轻盈的阅读体验，串起全球新闻、情绪信号与市场判断。
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
                首页变成内容优先的情报入口：先看重点事件，再进入深色数据工作区完成筛选、跟踪与研判。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/news" className="button-primary rounded-xl px-4 py-3 text-sm font-medium">
                  浏览今日新闻
                </Link>
                <Link href="/market" className="button-secondary rounded-xl px-4 py-3 text-sm font-medium">
                  查看市场脉冲
                </Link>
              </div>
            </div>

            <div className="content-panel-strong overflow-hidden p-3">
              {featuredArticle ? (
                <div className="space-y-4">
                  <div className="news-visual aspect-[4/3]">
                    <Image src={getArticleVisualDataUri(featuredArticle)} alt={getArticleVisualAlt(featuredArticle)} fill unoptimized sizes="(min-width: 1024px) 360px, 100vw" />
                  </div>
                  <div className="px-1 pb-2">
                    <p className="section-kicker">{getArticleLabel(featuredArticle)}</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-950 text-balance">
                      <Link href={`/news/${featuredArticle.id}`} className="hover:text-[#2F6BFF]">
                        {featuredArticle.title}
                      </Link>
                    </h2>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {featuredArticle.description ?? "聚焦当前最值得优先阅读的新闻，并将其作为今日情报视图的主线入口。"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="news-visual aspect-[4/3]" />
              )}
            </div>
          </div>
          {hasError ? (
            <p className="mt-3 rounded-md border border-[#EF4444]/35 bg-[#EF444415] px-3 py-2 text-xs text-[#FCA5A5]">
              数据请求失败，当前展示为空结果，请稍后刷新重试。
            </p>
          ) : null}
        </header>

        {currentUser ? (
          <section className="content-panel-strong p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="section-kicker">Personal workspace</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">{currentUser.name ?? currentUser.email}</h2>
                <p className="mt-2 text-sm text-slate-600">今天继续跟踪你的股票、自选和价格告警。</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/profile" className="button-primary rounded-xl px-4 py-2 text-sm font-medium">
                  打开个人中心
                </Link>
                <Link href="/watchlist" className="button-secondary rounded-xl px-4 py-2 text-sm">
                  查看自选股
                </Link>
                <Link href="/alerts" className="button-secondary rounded-xl px-4 py-2 text-sm">
                  查看告警
                </Link>
              </div>
            </div>
          </section>
        ) : null}

        {currentUser ? (
          <section className="data-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">最近未读通知</h2>
                <p className="mt-1 text-sm text-[#94A3B8]">优先查看最新触发且尚未处理的价格告警。</p>
              </div>
              <Link
                href="/notifications?scope=unread"
                className="button-dark inline-flex items-center rounded-xl px-4 py-2 text-sm"
              >
                查看未读通知
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <article className="data-subpanel p-4">
                <p className="text-xs text-[#94A3B8]">未读总数</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[#F8FAFC]">{unreadNotifications.length}</p>
              </article>
              <article className="data-subpanel p-4">
                <p className="text-xs text-[#94A3B8]">最新触发时间</p>
                <p className="mt-2 text-sm font-semibold text-[#F8FAFC]">{formatDateTime(unreadNotificationsSummary.latestTriggeredAt)}</p>
              </article>
              <article className="data-subpanel p-4">
                <p className="text-xs text-[#94A3B8]">最集中 ticker</p>
                <p className="mt-2 text-sm font-semibold text-[#F8FAFC]">
                  {unreadNotificationsSummary.topTicker
                    ? `${unreadNotificationsSummary.topTicker} ×${unreadNotificationsSummary.topTickerCount}`
                    : "--"}
                </p>
              </article>
            </div>
            {notificationsError ? (
              <p className="mt-3 rounded-md border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3 py-2 text-xs text-[#FCD34D]">
                未读通知暂时不可用，请稍后刷新重试。
              </p>
            ) : null}
            {unreadNotifications.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-[#1E293B] px-4 py-8 text-center text-sm text-[#94A3B8]">
                当前没有未读通知。
              </div>
            ) : (
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {unreadNotifications.slice(0, 3).map((notification) => (
                   <article key={notification.alert_id} className="data-subpanel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#F8FAFC]">{notification.ticker}</p>
                        <p className="mt-1 text-xs text-[#94A3B8]">
                          价格{notification.operator === "above" ? "高于" : "低于"} {notification.threshold.toFixed(2)}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-2 py-1 text-[11px] text-[#FCD34D]">
                        未读
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-[#94A3B8]">
                      触发时间：{formatDateTime(notification.triggered_at)} · 触发价：
                      {notification.triggered_price !== null ? notification.triggered_price.toFixed(2) : "--"}
                    </p>
                    <div className="mt-4 flex justify-end">
                      <Link href={`/analysis/${notification.stock_id}`} className="text-sm text-[#60A5FA] hover:text-[#93C5FD]">
                        查看个股
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

          <section aria-label="dashboard stats" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">总新闻量</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{total}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">当前页记录</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{articles.length}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">覆盖来源</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{sources}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">利好占比</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{positiveRatio}%</p>
          </article>
        </section>

        <section className="data-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">行情同步状态</h2>
                <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-medium ${syncBadge.className}`}>
                  {syncBadge.label}
                </span>
              </div>
              <p className="text-sm text-[#94A3B8]">
                Provider：{syncStatus.provider_name ?? "--"} · 最近成功：{formatDateTime(syncStatus.last_succeeded_at)}
              </p>
              {syncStatus.last_error ? (
                <p className="text-xs text-[#FCA5A5]">最近错误：{syncStatus.last_error}</p>
              ) : syncStatusError ? (
                <p className="text-xs text-[#FBBF24]">状态接口暂不可用，行情同步信息可能延迟。</p>
              ) : null}
            </div>
            <Link
              href="/stocks"
               className="button-dark inline-flex items-center rounded-xl px-4 py-2 text-sm"
            >
              查看股票页
            </Link>
            <ManualStockSyncButton />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <article className="data-subpanel p-4">
              <p className="text-[11px] text-[#64748B]">请求股票数</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[#F8FAFC]">{syncStatus.tickers_requested}</p>
            </article>
            <article className="data-subpanel p-4">
              <p className="text-[11px] text-[#64748B]">成功 / 失败</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[#F8FAFC]">
                {syncStatus.tickers_succeeded} / {syncStatus.tickers_failed}
              </p>
            </article>
            <article className="data-subpanel p-4">
              <p className="text-[11px] text-[#64748B]">抓取价格点</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[#F8FAFC]">{syncStatus.price_points_fetched}</p>
            </article>
            <article className="data-subpanel p-4">
              <p className="text-[11px] text-[#64748B]">写入 / 更新</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-[#F8FAFC]">
                {syncStatus.inserted} / {syncStatus.updated}
              </p>
            </article>
          </div>
        </section>

        <section className="data-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">告警摘要</h2>
              <p className="mt-1 text-sm text-[#94A3B8]">汇总当前价格阈值告警的监控状态与最近触发记录。</p>
            </div>
            <Link
              href="/alerts"
               className="button-dark inline-flex items-center rounded-xl px-4 py-2 text-sm"
            >
              查看全部告警
            </Link>
          </div>
          {alertsError ? (
            <p className="mt-3 rounded-md border border-[#F59E0B]/35 bg-[#F59E0B]/10 px-3 py-2 text-xs text-[#FCD34D]">
              告警摘要暂时不可用，请稍后刷新重试。
            </p>
          ) : null}
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="grid grid-cols-2 gap-3">
              <article className="data-subpanel p-4">
                <p className="text-[11px] text-[#64748B]">活跃告警</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[#F8FAFC]">{activeAlerts.length}</p>
              </article>
              <article className="data-subpanel p-4">
                <p className="text-[11px] text-[#64748B]">已触发</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-[#F8FAFC]">{triggeredAlerts.length}</p>
              </article>
              <article className="data-subpanel col-span-2 p-4">
                <p className="text-[11px] text-[#64748B]">监控中股票</p>
                <p className="mt-2 text-sm text-[#CBD5E1]">
                  {activeAlerts.length > 0
                    ? activeAlerts.map((alert) => alert.ticker).slice(0, 4).join(" · ")
                    : "暂无活跃告警"}
                </p>
              </article>
            </div>
            <article className="data-subpanel p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-[#F8FAFC]">最近触发</h3>
                <span className="text-xs text-[#94A3B8]">最多显示 3 条</span>
              </div>
              {latestTriggeredAlerts.length === 0 ? (
                <div className="mt-4 rounded-md border border-dashed border-[#1E293B] px-4 py-8 text-center text-sm text-[#94A3B8]">
                  暂无已触发告警。
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  {latestTriggeredAlerts.map((alert) => (
                    <article key={alert.alert_id} className="rounded-xl border border-slate-700/70 bg-slate-950/45 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[#F8FAFC]">
                          {alert.ticker} · 价格{alert.operator === "above" ? "高于" : "低于"} {alert.threshold.toFixed(2)}
                        </p>
                        <span className="rounded-full border border-[#F59E0B]/40 bg-[#F59E0B]/15 px-2 py-1 text-[11px] text-[#FCD34D]">
                          已触发
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[#94A3B8]">
                        触发时间：{formatDateTime(alert.triggered_at)} · 触发价格：
                        {alert.triggered_price !== null ? alert.triggered_price.toFixed(2) : "--"}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <article className="content-panel-strong p-6 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">最新新闻</h2>
              <Link href="/news" className="text-sm text-[#3B82F6] transition-colors hover:text-[#2563EB]">
                查看全部
              </Link>
            </div>
            {latestNews.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#1E293B] px-4 py-10 text-center text-sm text-[#94A3B8]">
                暂无新闻数据
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2" aria-label="latest news list">
                {latestNews.map((article) => {
                  const sentiment = article.sentiment?.label ?? "neutral";
                  const sentimentMeta = SENTIMENT_META[sentiment];
                  return (
                     <article
                       key={article.id}
                       className="content-panel overflow-hidden p-3 transition-colors hover:-translate-y-0.5 hover:border-slate-300"
                     >
                       <div className="news-visual aspect-[16/10]">
                         <Image src={getArticleVisualDataUri(article)} alt={getArticleVisualAlt(article)} fill unoptimized sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" />
                       </div>
                       <div className="p-2">
                       <p className="section-kicker">{getArticleLabel(article)}</p>
                       <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-7 text-slate-950">
                         <Link href={`/news/${article.id}`} className="hover:text-[#2F6BFF]">
                           {article.title}
                         </Link>
                       </h3>
                       <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{article.description ?? "暂无摘要"}</p>
                       <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                         <span>{article.source_name ?? "未知来源"}</span>
                         <span aria-hidden="true">•</span>
                         <time dateTime={article.published_at}>{formatPublishedAt(article.published_at)}</time>
                         <span aria-hidden="true">•</span>
                         <span
                           className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${sentimentMeta.textClass} bg-slate-100`}
                         >
                           <span aria-hidden="true">{sentimentMeta.symbol}</span>
                           <span>{sentimentMeta.label}</span>
                         </span>
                       </div>
                       </div>
                     </article>
                   );
                 })}
               </div>
            )}
          </article>

          <div className="space-y-6">
            <LiveNewsFeed endpoint={getRealtimeHttpEndpoint("/api/v1/stream/news")} initialArticles={latestNews.slice(0, 5)} />

            <article className="data-panel p-5">
              <h2 className="text-lg font-semibold">情感分布</h2>
              <p className="mt-1 text-xs text-[#94A3B8]">基于当前页已分析新闻统计</p>
              <div className="mt-4 space-y-3" aria-label="sentiment distribution">
                {sentimentEntries.map((entry) => {
                  const meta = SENTIMENT_META[entry.key];
                  return (
                    <div key={entry.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`inline-flex items-center gap-1 ${meta.textClass}`}>
                          <span aria-hidden="true">{meta.symbol}</span>
                          <span>{meta.label}</span>
                        </span>
                        <span className="tabular-nums text-[#94A3B8]">
                          {entry.count} · {entry.percent}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#1E293B]">
                        <div className={`h-2 rounded-full ${meta.bgClass} ${getWidthClass(entry.percent)}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="content-panel p-5">
              <h2 className="text-lg font-semibold">快捷入口</h2>
              <div className="mt-4 grid gap-3">
                <Link
                  href="/news"
                  className="button-secondary rounded-xl px-4 py-3 text-sm"
                >
                  新闻信息流
                </Link>
                <Link
                  href="/search"
                  className="button-secondary rounded-xl px-4 py-3 text-sm"
                >
                  全文搜索
                </Link>
                <Link
                  href="/analysis"
                  className="button-secondary rounded-xl px-4 py-3 text-sm"
                >
                  市场分析
                </Link>
                <Link
                  href="/market"
                  className="button-secondary rounded-xl px-4 py-3 text-sm"
                >
                  市场脉冲
                </Link>
                <Link
                  href="/watchlist"
                  className="button-secondary rounded-xl px-4 py-3 text-sm"
                >
                  自选股
                </Link>
                <Link
                  href="/alerts"
                  className="button-secondary rounded-xl px-4 py-3 text-sm"
                >
                  价格告警
                </Link>
                <Link
                  href="/notifications"
                  className="rounded-md border border-[#1E293B] bg-[#1A2035] px-4 py-3 text-sm transition-colors hover:border-[#334155]"
                >
                  通知中心
                </Link>
                <Link
                  href="/news?category=economy"
                  className="rounded-md border border-[#1E293B] bg-[#1A2035] px-4 py-3 text-sm transition-colors hover:border-[#334155]"
                >
                  经济类新闻
                </Link>
              </div>
              <p className="mt-4 text-xs text-[#94A3B8]">今日新增：{todayCount} 条</p>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
