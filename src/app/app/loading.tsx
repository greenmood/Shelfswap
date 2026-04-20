// Rendered automatically by Next.js during server navigation into /app/*
// while the destination page's server component fetches data. The layout
// hints at a typical tab page (title + list rows) so the transition feels
// like the same shape loading, not a blank flash. Generic enough to serve
// list pages and detail pages both.

export default function AppLoading() {
  return (
    <main
      className="mx-auto flex min-h-screen max-w-md flex-col p-6 pb-24 md:pb-6"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-6 w-24 animate-pulse rounded bg-cream-dim" />

      <div className="mt-8 space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-md border border-subtle p-3"
          >
            <div
              className="h-[84px] w-[56px] shrink-0 animate-pulse rounded-[2px] bg-cream-dim"
              aria-hidden
            />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 w-3/4 animate-pulse rounded bg-cream-dim" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-cream-dim" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </main>
  );
}
