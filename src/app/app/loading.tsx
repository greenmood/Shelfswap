// Rendered by Next.js during server navigation into /app/*. Approximates
// the Library/Discover/Swaps shape (serif title + optional chrome + list
// rows in a paper card) since those are the most-visited destinations.

export default function AppLoading() {
  return (
    <main
      className="mx-auto flex min-h-screen max-w-md flex-col p-6 pb-24 md:max-w-lg md:pb-6"
      aria-busy="true"
      aria-live="polite"
    >
      {/* Title block — matches a serif h1 line */}
      <div className="h-7 w-28 animate-pulse rounded bg-cream-dim" />

      {/* Sub-chrome placeholder (counter line / search / segmented control
          all fit this shape at a glance) */}
      <div className="mt-4 h-4 w-24 animate-pulse rounded bg-cream-dim" />

      {/* List card — mirrors the actual Library/Discover list: paper card
          with divider-separated rows, sm covers (40×60), title + author +
          pill placeholder. */}
      <div className="mt-4 overflow-hidden rounded-md bg-paper">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="flex items-start gap-3 border-b border-divider px-4 py-3 last:border-b-0"
          >
            <div
              className="h-[60px] w-[40px] shrink-0 animate-pulse rounded-[2px] bg-cream-dim"
              aria-hidden
            />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 w-3/4 animate-pulse rounded bg-cream-dim" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-cream-dim" />
              <div className="mt-1 h-3 w-16 animate-pulse rounded-full bg-cream-dim" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading…</span>
    </main>
  );
}
