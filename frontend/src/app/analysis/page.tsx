import Link from "next/link";

import { NumericFilterPanel } from "@/components/numeric-filter-panel";
import { apiGet } from "@/lib/api";
import { buildNumericQueryHref, resolveBoundedQuery } from "@/lib/analysis-query";
import type { ApiResponse } from "@/types/api";
import type {
  AnalysisOverviewData,
  AnalysisOverviewQueryParams,
  AnalysisSentimentLabel
} from "@/types/analysis";

interface AnalysisPageProps {
  searchParams?: Promise<{
    window_hours?: string;
    article_limit?: string;
    top_signals?: string;
  }>;
}

interface AnalysisPageData {
  response: ApiResponse<AnalysisOverviewData>;
  hasError: boolean;
}

const ANALYSIS_QUERY_BOUNDS = {
  window_hours: { min: 1, max: 168, fallback: 24 },
  article_limit: { min: 1, max: 500, fallback: 200 },
  top_signals: { min: 1, max: 50, fallback: 8 }
} as const;

const ANALYSIS_FILTER_FIELDS = [
  { key: "window_hours", label: "时间窗口 (h)", min: 1, max: 168, fallback: 24 },
  { key: "article_limit", label: "样本上限", min: 1, max: 500, fallback: 200 },
  { key: "top_signals", label: "信号条数", min: 1, max: 50, fallback: 8 }
];

const ANALYSIS_FILTER_PRESETS: Array<{ label: string; query: AnalysisOverviewQueryParams }> = [
  { label: "默认窗口", query: { window_hours: 24, article_limit: 200, top_signals: 8 } },
  { label: "近 6 小时", query: { window_hours: 6, article_limit: 120, top_signals: 6 } },
  { label: "近 72 小时", query: { window_hours: 72, article_limit: 300, top_signals: 12 } },
  { label: "高密度信号", query: { window_hours: 24, article_limit: 300, top_signals: 20 } }
];

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
  AnalysisSentimentLabel,
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

function resolveAnalysisQuery(
  searchParams: { window_hours?: string; article_limit?: string; top_signals?: string } | undefined
): AnalysisOverviewQueryParams {
  return resolveBoundedQuery(searchParams, ANALYSIS_QUERY_BOUNDS);
}

async function fetchAnalysisData(query: AnalysisOverviewQueryParams): Promise<AnalysisPageData> {
  try {
    const response = await apiGet<AnalysisOverviewData>("/api/v1/analysis/overview", query);
    return { response, hasError: false };
  } catch {
    return {
      response: {
        status: "error",
        data: {
          generated_at: new Date().toISOString(),
          stats_cards: {
            total_articles: 0,
            analyzed_sentiment_articles: 0,
            bullish_signals: 0,
            bearish_signals: 0
          },
          sentiment_distribution: [
            { label: "positive", count: 0, ratio: 0 },
            { label: "negative", count: 0, ratio: 0 },
            { label: "neutral", count: 0, ratio: 0 }
          ],
          top_impact_signals: []
        }
      },
      hasError: true
    };
  }
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

function getWidthClass(percent: number): (typeof WIDTH_CLASSES)[number] {
  const normalized = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const index = Math.round(normalized / (100 / (WIDTH_CLASSES.length - 1)));
  return WIDTH_CLASSES[index];
}

export default async function AnalysisPage({ searchParams }: AnalysisPageProps): Promise<JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const query = resolveAnalysisQuery(resolvedSearchParams);
  const { response, hasError } = await fetchAnalysisData(query);
  const overview = response.data;
  const statsCards = overview.stats_cards;
  const topSignals = overview.top_impact_signals;
  const sentimentRows: Array<{ key: AnalysisSentimentLabel; count: number; percent: number }> = [
    { key: "positive", count: 0, percent: 0 },
    { key: "negative", count: 0, percent: 0 },
    { key: "neutral", count: 0, percent: 0 }
  ];
  const sentimentMap = new Map(overview.sentiment_distribution.map((item) => [item.label, item]));
  for (const row of sentimentRows) {
    const source = sentimentMap.get(row.key);
    if (source) {
      row.count = source.count;
      row.percent = Math.round(source.ratio * 100);
    }
  }

  return (
    <main className="page-shell">
      <section className="page-container space-y-6">
        <header className="page-hero overflow-hidden p-6 lg:p-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <p className="eyebrow-label">Analysis overview</p>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">市场分析</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
              基于当前新闻数据生成情感分布与影响信号，帮助快速定位高影响事件。
            </p>
          </div>
          <div className="content-panel p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Overview</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-semibold text-slate-950">{statsCards.total_articles}</p>
                <p className="text-xs text-slate-500">样本新闻</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-slate-950">{topSignals.length}</p>
                <p className="text-xs text-slate-500">高影响信号</p>
              </div>
            </div>
          </div>
          </div>
          <NumericFilterPanel
            pathname="/analysis"
            currentQuery={query}
            fields={ANALYSIS_FILTER_FIELDS}
            presets={ANALYSIS_FILTER_PRESETS}
            summaryItems={[
              { label: "时间窗口", value: `${query.window_hours}h` },
              { label: "样本上限", value: query.article_limit },
              { label: "信号数", value: query.top_signals }
            ]}
            storageKey="newsintel.analysis.filters"
            secondaryLink={{
              href: buildNumericQueryHref("/market", {
                window_hours: query.window_hours,
                article_limit: query.article_limit
              }),
              label: "查看市场脉冲"
            }}
          />
          {hasError ? (
            <p className="mt-3 rounded-md border border-[#EF4444]/35 bg-[#EF444415] px-3 py-2 text-xs text-[#FCA5A5]">
              分析数据加载失败，当前展示为空结果。
            </p>
          ) : null}
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">样本新闻总量</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{statsCards.total_articles}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">已分析情感新闻</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{statsCards.analyzed_sentiment_articles}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">利好信号数</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-emerald-400">{statsCards.bullish_signals}</p>
          </article>
          <article className="content-panel p-5">
            <p className="text-xs text-slate-500">利空信号数</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums text-red-400">{statsCards.bearish_signals}</p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <article className="data-panel p-5">
            <h2 className="text-lg font-semibold">情感分布</h2>
            <p className="mt-1 text-xs text-[#94A3B8]">按已分析情感新闻统计占比</p>
            <div className="mt-4 space-y-3">
              {sentimentRows.map((row) => {
                const meta = SENTIMENT_META[row.key];
                return (
                  <div key={row.key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`inline-flex items-center gap-1 ${meta.textClass}`}>
                        <span aria-hidden="true">{meta.symbol}</span>
                        <span>{meta.label}</span>
                      </span>
                      <span className="tabular-nums text-[#94A3B8]">
                        {row.count} · {row.percent}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[#1E293B]">
                      <div className={`h-2 rounded-full ${meta.bgClass} ${getWidthClass(row.percent)}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="content-panel-strong p-5 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">高影响信号</h2>
              <Link href="/news" className="text-sm text-[#3B82F6] hover:text-[#2563EB]">
                查看新闻流
              </Link>
            </div>
            {topSignals.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#1E293B] px-4 py-10 text-center text-sm text-[#94A3B8]">
                暂无影响信号数据
              </div>
            ) : (
              <div className="space-y-3">
                {topSignals.map((signal) => {
                  const sentimentLabel: AnalysisSentimentLabel =
                    signal.direction === "bullish"
                      ? "positive"
                      : signal.direction === "bearish"
                        ? "negative"
                        : "neutral";
                  const meta = SENTIMENT_META[sentimentLabel];
                  return (
                    <article
                      key={`${signal.article_id}-${signal.stock_id}-${signal.direction}`}
                      className="content-panel p-4 transition-colors hover:border-slate-300"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="line-clamp-2 text-sm font-medium leading-6 sm:text-base">
                          <Link href={`/news/${signal.article_id}`} className="hover:text-[#3B82F6]">
                            {signal.article_title}
                          </Link>
                        </h3>
                        <Link
                          href={`/analysis/${signal.stock_id}`}
                           className="button-secondary rounded-xl px-2.5 py-1 text-xs tabular-nums hover:text-[#3B82F6]"
                        >
                          #{signal.stock_id}
                        </Link>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
                        <time dateTime={signal.published_at}>{formatDateTime(signal.published_at)}</time>
                        <span aria-hidden="true">•</span>
                         <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${meta.textClass} bg-slate-100`}>
                          <span aria-hidden="true">{meta.symbol}</span>
                          <span>{meta.label}</span>
                        </span>
                        <span aria-hidden="true">•</span>
                        <span className="tabular-nums">
                          影响分：{signal.impact_score.toFixed(2)} · 置信度：{Math.round(signal.confidence * 100)}%
                        </span>
                        <span aria-hidden="true">•</span>
                        <Link href={`/analysis/${signal.stock_id}`} className="text-[#3B82F6] hover:text-[#2563EB]">
                          查看个股分析
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </article>
        </section>

        <section className="content-panel p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">个股分析入口</h2>
              <p className="mt-1 text-xs text-[#94A3B8]">先通过搜索页按 ticker 或公司关键词定位相关新闻。</p>
            </div>
            <Link
              href="/search"
              className="button-secondary rounded-xl px-4 py-2 text-sm"
            >
              前往搜索
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































































