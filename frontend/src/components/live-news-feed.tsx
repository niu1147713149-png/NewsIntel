"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useSSE } from "@/hooks/use-sse";
import type { Article } from "@/types/news";

interface LiveNewsFeedProps {
  endpoint: string;
  initialArticles: Article[];
}

interface NewsStreamPayload {
  items?: Article[];
  count?: number;
  tick?: number;
}

export function mergeIncrementalArticles(currentArticles: Article[], incomingArticles: Article[]): Article[] {
  const seenIds = new Set<number>();
  const mergedArticles: Article[] = [];

  for (const article of [...incomingArticles, ...currentArticles]) {
    if (seenIds.has(article.id)) {
      continue;
    }
    seenIds.add(article.id);
    mergedArticles.push(article);
    if (mergedArticles.length >= 5) {
      break;
    }
  }

  return mergedArticles;
}

function formatPublishedAt(isoString: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(isoString));
}

export function LiveNewsFeed({ endpoint, initialArticles }: LiveNewsFeedProps): JSX.Element {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const sse = useSSE({
    url: endpoint,
    autoConnect: true,
    eventNames: ["news-snapshot", "news-update"]
  });

  useEffect(() => {
    if (!sse.lastMessage) {
      return;
    }

    try {
      const payload = JSON.parse(sse.lastMessage) as NewsStreamPayload;
      if (payload.items?.length) {
        setArticles((currentArticles) => {
          if (payload.tick) {
            return mergeIncrementalArticles(currentArticles, payload.items ?? []);
          }
          return payload.items?.slice(0, 5) ?? currentArticles;
        });
      }
    } catch {
      return;
    }
  }, [sse.lastMessage]);

  const statusText = useMemo(() => {
    if (sse.status === "open") {
      return "实时流已连接";
    }
    if (sse.status === "connecting") {
      return "实时流连接中";
    }
    if (sse.status === "error") {
      return "实时流暂时中断";
    }
    return "等待实时流";
  }, [sse.status]);

  return (
    <article className="content-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow-label">Live desk</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">实时新闻 feed</h2>
        </div>
        <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">{statusText}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">直接消费 SSE 新闻流，优先展示最新快照与连续更新事件。</p>

      <div className="mt-4 space-y-3" aria-label="live news feed list">
        {articles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">等待实时新闻进入流中...</div>
        ) : (
          articles.map((article) => (
            <article key={article.id} className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>{article.source_name ?? "未知来源"}</span>
                <span aria-hidden="true">•</span>
                <time dateTime={article.published_at}>{formatPublishedAt(article.published_at)}</time>
              </div>
              <h3 className="mt-2 text-sm font-semibold leading-6 text-slate-950">
                <Link href={`/news/${article.id}`} className="hover:text-[#2F6BFF]">
                  {article.title}
                </Link>
              </h3>
              <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{article.description ?? "暂无摘要"}</p>
            </article>
          ))
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>最近消息时间 {sse.lastMessageAt ? formatPublishedAt(sse.lastMessageAt) : "--"}</span>
        <Link href="/news" className="font-medium text-sky-600 hover:text-sky-700">
          进入新闻信息流
        </Link>
      </div>
    </article>
  );
}
