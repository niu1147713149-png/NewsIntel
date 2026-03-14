export default function SearchLoading(): JSX.Element {
  return (
    <main className="page-shell">
      <section className="page-container max-w-5xl space-y-4">
        <div className="page-hero h-48 animate-pulse" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`search-skeleton-${index}`}
            className="surface-panel h-32 animate-pulse"
          />
        ))}
      </section>
    </main>
  );
}
