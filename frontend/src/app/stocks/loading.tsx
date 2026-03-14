export default function StocksLoading(): JSX.Element {
  return (
    <main className="page-shell">
      <section className="page-container space-y-6">
        <div className="page-hero h-32 animate-pulse" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="surface-panel h-56 animate-pulse" />
          ))}
        </div>
      </section>
    </main>
  );
}
