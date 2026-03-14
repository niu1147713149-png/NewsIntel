export default function StockAnalysisLoading(): JSX.Element {
  return (
    <main className="page-shell">
      <section className="page-container space-y-4">
        <div className="page-hero h-28 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={`stock-analysis-stat-skeleton-${index}`}
              className="surface-panel h-28 animate-pulse"
            />
          ))}
        </div>
        <div className="surface-panel h-96 animate-pulse" />
      </section>
    </main>
  );
}
