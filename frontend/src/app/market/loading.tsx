export default function MarketLoading(): JSX.Element {
  return (
    <main className="page-shell">
      <section className="page-container space-y-4">
        <div className="page-hero h-28 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`market-stat-skeleton-${index}`}
              className="surface-panel h-28 animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="surface-panel h-96 animate-pulse" />
          <div className="surface-panel h-96 animate-pulse xl:col-span-2" />
        </div>
        <div className="surface-panel h-96 animate-pulse" />
      </section>
    </main>
  );
}
