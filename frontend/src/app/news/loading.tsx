/**
 * Render skeleton placeholders while news page data is loading.
 * @returns {JSX.Element} Loading skeleton layout.
 */
export default function NewsLoading(): JSX.Element {
  return (
    <main className="page-shell">
      <section className="page-container max-w-5xl space-y-4">
        <div className="page-hero h-24 animate-pulse" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`news-skeleton-${index}`}
            className="surface-panel h-32 animate-pulse"
          />
        ))}
      </section>
    </main>
  );
}
