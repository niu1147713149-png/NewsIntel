import Link from "next/link";
import Image from "next/image";

import { apiGet } from "@/lib/api";
import { getArticleLabel, getArticleVisualAlt, getArticleVisualDataUri } from "@/lib/article-visual";
import type { ApiResponse } from "@/types/api";
import type { Article } from "@/types/news";

interface SearchPageProps {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    from?: string;
    to?: string;
    page?: string;
    size?: string;
  }>;
}

interface SearchQueryParams {
  q?: string;
  category?: string;
  from?: string;
  to?: string;
  page: number;
  size: number;
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function normalizeQueryValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildQueryString(params: SearchQueryParams): string {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("size", String(params.size));

  if (params.q) {
    query.set("q", params.q);
  }
  if (params.category) {
    query.set("category", params.category);
  }
  if (params.from) {
    query.set("from", params.from);
  }
  if (params.to) {
    query.set("to", params.to);
  }

  return query.toString();
}

async function fetchSearchResults(params: SearchQueryParams): Promise<ApiResponse<Article[]>> {
  return apiGet<Article[]>("/api/v1/news/search", {
    q: params.q,
    category: params.category,
    from: params.from,
    to: params.to,
    page: params.page,
    size: params.size
  });
}

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

export default async function SearchPage({ searchParams }: SearchPageProps): Promise<JSX.Element> {
  const resolvedSearchParams = await searchParams;
  const page = parsePositiveInt(resolvedSearchParams?.page, 1);
  const size = Math.min(parsePositiveInt(resolvedSearchParams?.size, 20), 100);
  const q = normalizeQueryValue(resolvedSearchParams?.q);
  const category = normalizeQueryValue(resolvedSearchParams?.category);
  const from = normalizeQueryValue(resolvedSearchParams?.from);
  const to = normalizeQueryValue(resolvedSearchParams?.to);

  const response = await fetchSearchResults({ q, category, from, to, page, size });
  const articles = response.data;
  const total = response.meta?.total ?? articles.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const hasPrevPage = page > 1;
  const hasNextPage = page < totalPages;

  const prevQuery = buildQueryString({ q, category, from, to, page: page - 1, size });
  const nextQuery = buildQueryString({ q, category, from, to, page: page + 1, size });

  return (
    <main className="page-shell">
      <section className="page-container max-w-5xl">
        <header className="page-hero mb-6 p-6">
          <p className="eyebrow-label">Research search</p>
          <h1 className="text-2xl font-semibold sm:text-3xl">新闻搜索</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">接入 /api/v1/news/search，支持关键词、分类、时间范围与分页查询。</p>
          <form action="/search" method="get" className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              关键词 q
              <input
                name="q"
                defaultValue={q}
                placeholder="输入关键词，如 AI、美联储"
                className="input-surface h-10 rounded-xl px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              分类 category
              <input
                name="category"
                defaultValue={category}
                placeholder="如 economy"
                className="input-surface h-10 rounded-xl px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              开始时间 from
              <input
                type="datetime-local"
                name="from"
                defaultValue={from}
                className="input-surface h-10 rounded-xl px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500">
              结束时间 to
              <input
                type="datetime-local"
                name="to"
                defaultValue={to}
                className="input-surface h-10 rounded-xl px-3 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-500 sm:col-span-1">
              每页 size
              <input
                type="number"
                min={1}
                max={100}
                name="size"
                defaultValue={size}
                className="input-surface h-10 rounded-xl px-3 text-sm"
              />
            </label>
            <div className="flex items-end gap-2 sm:col-span-1">
              <input type="hidden" name="page" value="1" />
              <button type="submit" className="button-primary h-10 rounded-xl px-4 text-sm font-medium">
                查询
              </button>
              <Link href="/search" className="button-secondary inline-flex h-10 items-center rounded-xl px-4 text-sm">
                重置
              </Link>
            </div>
          </form>
        </header>

        {articles.length === 0 ? (
          <section className="content-panel-strong p-10 text-center">
            <h2 className="text-xl font-semibold text-slate-950">暂无搜索结果</h2>
            <p className="mt-2 text-sm text-slate-600">请调整关键词、分类或时间范围后重试。</p>
          </section>
        ) : (
          <section className="space-y-4" aria-label="search result list">
            {articles.map((article) => (
              <article key={article.id} className="content-panel-strong overflow-hidden p-3 transition-all hover:-translate-y-0.5 hover:border-slate-300">
                <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-start">
                  <div className="news-visual aspect-[16/10] md:h-full">
                    <Image src={getArticleVisualDataUri(article)} alt={getArticleVisualAlt(article)} fill unoptimized sizes="(min-width: 768px) 220px, 100vw" />
                  </div>
                  <div className="p-2">
                    <p className="section-kicker">{getArticleLabel(article)}</p>
                    <h2 className="mt-2 text-lg font-semibold leading-6 text-slate-950">
                      <Link href={`/news/${article.id}`} className="hover:text-[#2F6BFF]">
                        {article.title}
                      </Link>
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{article.description ?? "暂无摘要"}</p>
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
                                ? "text-emerald-500"
                                : article.sentiment.label === "negative"
                                  ? "text-red-500"
                                  : "text-amber-500"
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
                      className="mt-3 inline-flex text-xs font-medium text-[#2F6BFF] underline-offset-2 hover:underline"
                    >
                      查看原文
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        <nav aria-label="search pagination" className="mt-6 flex items-center justify-between">
          {hasPrevPage ? (
            <Link
              href={`/search?${prevQuery}`}
              className="button-secondary rounded-xl px-4 py-2 text-sm"
            >
              上一页
            </Link>
          ) : (
            <span className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-400">上一页</span>
          )}
          <span className="text-sm text-slate-500">
            第 {page} 页 · 共 {totalPages} 页
          </span>
          {hasNextPage ? (
            <Link
              href={`/search?${nextQuery}`}
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
