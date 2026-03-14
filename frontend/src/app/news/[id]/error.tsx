"use client";

import Link from "next/link";

interface NewsDetailErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Render recoverable error UI for /news/[id] route segment.
 * @param {NewsDetailErrorProps} props Route error boundary props.
 * @returns {JSX.Element} Error fallback with retry action.
 */
export default function NewsDetailError({ error, reset }: NewsDetailErrorProps): JSX.Element {
  return (
    <main className="page-shell flex items-center justify-center">
      <section className="page-container max-w-3xl rounded-2xl border border-[#EF4444]/30 bg-[#0F1629] p-8 shadow-[0_18px_48px_rgba(2,6,23,0.28)]">
        <p className="eyebrow-label">Detail error</p>
        <h1 className="text-2xl font-semibold text-[#F1F5F9]">新闻详情加载失败</h1>
        <p className="mt-3 text-sm text-[#94A3B8]">请求 /api/v1/news/{`{id}`} 时发生错误，请稍后重试。</p>
        <p className="mt-2 text-xs text-[#475569]">{error.message}</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="button-secondary rounded-xl px-4 py-2 text-sm text-[#F1F5F9]"
          >
            重试
          </button>
          <Link
            href="/news"
            className="button-secondary rounded-xl px-4 py-2 text-sm text-[#F1F5F9]"
          >
            返回新闻列表
          </Link>
        </div>
      </section>
    </main>
  );
}
