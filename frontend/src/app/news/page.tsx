import Link from "next/link";
import Image from "next/image";

import { apiGet } from "@/lib/api";
import { getArticleLabel, getArticleVisualAlt, getArticleVisualDataUri } from "@/lib/article-visual";
import type { ApiResponse } from "@/types/api";
import type { Article } from "@/types/news";

interface NewsPageProps {
  searchParams?: Promise<{
    page?: string;
    size?: string;
    category?: string;
  }>;
}

/**
 * Parse positive integer from search param and fallback to default.
 * @param {string | undefined} value Raw query string value.
 * @param {number} fallback Value used when query is invalid.
 * @returns {number} Safe positive integer value.
 */
function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

/**
 * Request paginated news list from backend API.
 * @param {number} page Current page number.
 * @param {number} size Items per page.
 * @returns {Promise<ApiResponse<Article[]>>} Standardized article list response.
 */
async function fetchNews(page: number, size: number, category?: string): Promise<ApiResponse<Article[]>> {
  return apiGet<Article[]>("/api/v1/news", { page, size, category });
}

/**
 * Format article publish date for zh-CN locale.
 * @param {string} isoString ISO date string.
 * @returns {string} Human-friendly local date string.
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
 * Render paginated news page for "/news".
 * @param {NewsPageProps} props Next.js route props.
 * @returns {Promise<JSX.Element>} News list UI with empty state fallback.
 */
export default async function NewsPage({ searchParams }: NewsPageProps): Promise<JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const page = parsePositiveInt(resolvedSearchParams?.page, 1);
  const size = parsePositiveInt(resolvedSearchParams?.size, 20);
  const category = resolvedSearchParams?.category?.trim() || undefined;

  const response = await fetchNews(page, size, category);
  const articles = response.data;
  const total = response.meta?.total ?? articles.length;
  const hasNextPage = page * size < total;
  const hasPrevPage = page > 1;

  return (
    <main className="page-shell">
      <section className="page-container max-w-6xl">
        <header className="page-hero mb-6 overflow-hidden p-6 lg:p-8">
          <p className="eyebrow-label">Intelligence feed</p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl text-balance">新闻信息流</h1>
              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                像媒体产品一样浏览新闻，像数据平台一样继续筛选与分析。列表加入封面图层与更强的阅读节奏。
              </p>
            </div>
            <div className="content-panel p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Feed summary</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-2xl font-semibold text-slate-950">{articles.length}</p>
                  <p className="text-xs text-slate-500">当前页条目</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-950">{total}</p>
                  <p className="text-xs text-slate-500">总记录</p>
                </div>
              </div>
            </div>
          </div>
          {category ? (
            <p className="mt-4 text-xs text-slate-500">
              当前分类：{category}
              <Link href="/news" className="ml-2 text-[#3B82F6] hover:text-[#2563EB]">
                清除筛选
              </Link>
            </p>
          ) : null}
        </header>

        {articles.length === 0 ? (
            <section className="content-panel-strong p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-950">暂无新闻</h2>
            <p className="mt-2 text-sm text-slate-600">当前没有可展示的新闻数据，请稍后刷新。</p>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="news list">
            {articles.map((article) => (
              <article
                key={article.id}
                className="content-panel-strong overflow-hidden p-3 transition-all hover:-translate-y-0.5 hover:border-slate-300"
              >
                <div className="news-visual aspect-[16/10]">
                  <Image src={getArticleVisualDataUri(article)} alt={getArticleVisualAlt(article)} fill unoptimized sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" />
                </div>
                <div className="p-2">
                <p className="section-kicker">{getArticleLabel(article)}</p>
                <h2 className="mt-2 text-xl font-semibold leading-7 text-slate-950">
                  <Link href={`/news/${article.id}`} className="hover:text-[#2F6BFF]">
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{article.description ?? "暂无摘要"}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>{article.source_name ?? "未知来源"}</span>
                  <span aria-hidden="true">•</span>
                  <time dateTime={article.published_at}>{formatPublishedAt(article.published_at)}</time>
                  {article.sentiment ? (
                    <>
                      <span aria-hidden="true">•</span>
                      <span
                        className={
                          article.sentiment.label === "positive"
                            ? "text-emerald-400"
                            : article.sentiment.label === "negative"
                              ? "text-red-400"
                              : "text-amber-400"
                        }
                      >
                         情感：{article.sentiment.label}
                       </span>
                     </>
                   ) : null}
                 </div>
                 <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-xs font-medium text-[#2F6BFF] underline-offset-2 hover:underline"
                 >
                   查看原文
                 </a>
                </div>
              </article>
            ))}
          </section>
        )}

        <nav aria-label="news pagination" className="mt-6 flex items-center justify-between">
          {hasPrevPage ? (
            <Link
              href={`/news?page=${page - 1}&size=${size}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              className="button-secondary rounded-xl px-4 py-2 text-sm"
            >
              上一页
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-400">上一页</span>
          )}
          <span className="text-sm text-slate-500">
            第 {page} 页 · 共 {Math.max(1, Math.ceil(total / size))} 页
          </span>
          {hasNextPage ? (
            <Link
              href={`/news?page=${page + 1}&size=${size}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
              className="button-secondary rounded-xl px-4 py-2 text-sm"
            >
              下一页
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-400">下一页</span>
          )}
        </nav>
      </section>
    </main>
  );
}
