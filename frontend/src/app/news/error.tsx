"use client";

interface NewsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Render recoverable error UI for /news route segment.
 * @param {NewsErrorProps} props Route error boundary props.
 * @returns {JSX.Element} Error fallback with retry action.
 */
export default function NewsError({ error, reset }: NewsErrorProps): JSX.Element {
  return (
    <main className="page-shell flex items-center justify-center">
      <section className="page-container max-w-3xl rounded-2xl border border-[#EF4444]/30 bg-[#0F1629] p-8 shadow-[0_18px_48px_rgba(2,6,23,0.28)]">
        <p className="eyebrow-label">Feed error</p>
        <h1 className="text-2xl font-semibold text-[#F1F5F9]">新闻加载失败</h1>
        <p className="mt-3 text-sm text-[#94A3B8]">请求 /api/v1/news 时发生错误，请稍后重试。</p>
        <p className="mt-2 text-xs text-[#475569]">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="button-secondary mt-6 rounded-xl px-4 py-2 text-sm text-[#F1F5F9]"
        >
          重试
        </button>
      </section>
    </main>
  );
}
