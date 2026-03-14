import Link from "next/link";

/**
 * Render not-found UI for invalid or missing news detail route.
 * @returns {JSX.Element} Not found fallback for /news/[id].
 */
export default function NewsDetailNotFound(): JSX.Element {
  return (
    <main className="page-shell flex items-center justify-center">
      <section className="page-container max-w-4xl page-hero p-8 text-center">
        <p className="eyebrow-label">Not found</p>
        <h1 className="text-2xl font-semibold">文章不存在</h1>
        <p className="mt-3 text-sm text-[#94A3B8]">
          未找到对应新闻内容，可能已被删除或 ID 无效。请返回新闻列表继续浏览。
        </p>
        <Link
          href="/news"
          className="button-secondary mt-6 inline-flex rounded-xl px-4 py-2 text-sm"
        >
          返回新闻列表
        </Link>
      </section>
    </main>
  );
}
