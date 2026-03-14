/**
 * Render skeleton placeholders while news detail page data is loading.
 * @returns {JSX.Element} Loading skeleton layout for detail route.
 */
export default function NewsDetailLoading(): JSX.Element {
  return (
    <main className="page-shell">
      <section className="page-container max-w-4xl space-y-4">
        <div className="page-hero h-40 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="surface-panel h-32 animate-pulse" />
          <div className="surface-panel h-32 animate-pulse" />
        </div>
        <div className="surface-panel h-52 animate-pulse" />
      </section>
    </main>
  );
}
