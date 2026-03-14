import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";

import { ApiRequestError, apiGet } from "@/lib/api";
import { getArticleLabel, getArticleVisualAlt, getArticleVisualDataUri } from "@/lib/article-visual";
import type { Article, SentimentLabel, StockImpact } from "@/types/news";

interface NewsDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface SentimentDisplayConfig {
  textColor: string;
  bgColor: string;
  label: string;
}

/**
 * Convert route param to a valid positive article id.
 * @param {string} rawId Dynamic route parameter from URL.
 * @returns {number | null} Parsed positive integer id, or null when invalid.
 */
function parseArticleId(rawId: string): number | null {
  const parsedId = Number(rawId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return null;
  }
  return parsedId;
}

/**
 * Request article detail from backend and convert 404 to nullable result.
 * @param {number} articleId Target article id.
 * @returns {Promise<Article | null>} Article detail data or null for not found.
 */
async function fetchNewsDetail(articleId: number): Promise<Article | null> {
  try {
    const response = await apiGet<Article>(`/api/v1/news/${articleId}`);
    return response.data;
  } catch (error: unknown) {
    if (error instanceof ApiRequestError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Format publish timestamp to zh-CN localized text.
 * @param {string} isoString ISO 8601 datetime string.
 * @returns {string} Formatted local datetime string.
 */
function formatPublishedAt(isoString: string): string {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

/**
 * Map sentiment label to UI color and localized label text.
 * @param {SentimentLabel} label Sentiment label from API.
 * @returns {SentimentDisplayConfig} Styling and localized text config.
 */
function getSentimentDisplayConfig(label: SentimentLabel): SentimentDisplayConfig {
  switch (label) {
    case "positive":
      return {
        textColor: "text-emerald-400",
        bgColor: "bg-emerald-400/10",
        label: "利好"
      };
    case "negative":
      return {
        textColor: "text-red-400",
        bgColor: "bg-red-400/10",
        label: "利空"
      };
    case "neutral":
      return {
        textColor: "text-amber-400",
        bgColor: "bg-amber-400/10",
        label: "中性"
      };
    default:
      return {
        textColor: "text-amber-400",
        bgColor: "bg-amber-400/10",
        label: "中性"
      };
  }
}

/**
 * Map impact direction to text color.
 * @param {StockImpact["direction"]} direction Predicted market impact direction.
 * @returns {string} Tailwind text color class name.
 */
function getImpactDirectionColor(direction: StockImpact["direction"]): string {
  if (direction === "bullish") {
    return "text-emerald-400";
  }
  if (direction === "bearish") {
    return "text-red-400";
  }
  return "text-amber-400";
}

/**
 * Render detail page for "/news/[id]" route using backend news detail API.
 * @param {NewsDetailPageProps} props Next.js route params.
 * @returns {Promise<JSX.Element>} Article detail page, empty state, or thrown error.
 */
export default async function NewsDetailPage({ params }: NewsDetailPageProps): Promise<JSX.Element> {
  const resolvedParams = await params;
  const articleId = parseArticleId(resolvedParams.id);
  if (articleId === null) {
    notFound();
  }

  const article = await fetchNewsDetail(articleId);
  if (!article) {
    notFound();
  }

  const sentimentDisplay = article.sentiment ? getSentimentDisplayConfig(article.sentiment.label) : null;

  return (
    <main className="page-shell">
      <article className="page-container max-w-4xl space-y-6">
        <header className="page-hero overflow-hidden p-6 lg:p-8">
          <nav className="mb-4">
            <Link href="/news" className="text-sm text-slate-500 hover:text-slate-950">
              ← 返回新闻列表
            </Link>
          </nav>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <p className="eyebrow-label">{getArticleLabel(article)}</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-5xl text-balance">{article.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                <span>{article.source_name ?? "未知来源"}</span>
                <span aria-hidden="true">•</span>
                <time dateTime={article.published_at}>{formatPublishedAt(article.published_at)}</time>
                {article.language ? (
                  <>
                    <span aria-hidden="true">•</span>
                    <span className="uppercase">{article.language}</span>
                  </>
                ) : null}
              </div>
              {article.description ? <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{article.description}</p> : null}
              <a
                href={article.url}
                target="_blank"
                rel="noreferrer"
                className="button-primary mt-6 inline-flex rounded-xl px-4 py-3 text-sm font-medium"
              >
                查看原文
              </a>
            </div>

            <div className="news-visual aspect-[4/3] shadow-[0_24px_60px_rgba(15,23,42,0.12)]">
              <Image src={getArticleVisualDataUri(article)} alt={getArticleVisualAlt(article)} fill unoptimized sizes="(min-width: 1024px) 360px, 100vw" />
            </div>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <section className="content-panel p-5">
            <h2 className="text-base font-semibold text-slate-950">情感分析</h2>
            {article.sentiment && sentimentDisplay ? (
              <div className={`mt-4 rounded-2xl border border-slate-200 p-4 ${sentimentDisplay.bgColor}`}>
                <p className={`text-sm font-semibold ${sentimentDisplay.textColor}`}>{sentimentDisplay.label}</p>
                <p className="mt-2 text-xs text-slate-500">
                  confidence: {(article.sentiment.confidence * 100).toFixed(1)}%
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">暂无情感分析数据</p>
            )}
          </section>

          <section className="content-panel p-5">
            <h2 className="text-base font-semibold text-slate-950">新闻分类</h2>
            {article.categories && article.categories.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-2">
                {article.categories.map((category) => (
                  <li
                    key={category.id}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 transition-colors hover:border-slate-300"
                  >
                    <Link href={`/news?category=${encodeURIComponent(category.slug)}`} className="hover:text-[#3B82F6]">
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">暂无分类数据</p>
            )}
          </section>
        </section>

        <section className="data-panel p-5">
          <h2 className="text-base font-semibold">市场影响评估</h2>
          {article.impacts.length === 0 ? (
            <p className="mt-4 text-sm text-slate-300">暂无影响评估结果</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {article.impacts.map((impact) => (
                <li key={impact.stock_id} className="data-subpanel p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-[#F1F5F9]">股票 ID: {impact.stock_id}</span>
                    <span className={getImpactDirectionColor(impact.direction)}>{impact.direction}</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-300">
                    score: {impact.impact_score.toFixed(3)} · confidence: {(impact.confidence * 100).toFixed(1)}%
                  </p>
                  {impact.reasoning ? <p className="mt-2 text-xs leading-5 text-slate-300">{impact.reasoning}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </main>
  );
}
