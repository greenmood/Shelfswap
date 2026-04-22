import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookCover } from "@/components/book-cover";
import {
  BookStatusPill,
  type BookStatus,
} from "@/components/book-status-pill";
import { AvailabilityToggle } from "./availability-toggle";

type Match = {
  owner_id: string;
  first_name: string | null;
  they_have: number; // books on their shelf I've hearted (and are available)
  they_want: number; // books on my shelf they've hearted (and are available)
};

export default async function AppHome() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const supabase = await createClient();

  // In parallel: profile, books, active-swap book IDs (both sides), and my
  // wishes so we can compute a mutual heart match below.
  const [
    { data: profile },
    { data: books },
    { data: asOwnerSwaps },
    { data: asRequesterSwaps },
    { data: myWishes },
  ] = await Promise.all([
    supabase.from("users").select("first_name").eq("id", user.id).single(),
    supabase
      .from("books")
      .select("id, title, author, cover_url, is_available, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("swap_requests")
      .select("requested_book_id")
      .in("status", ["pending", "accepted"])
      .eq("owner_id", user.id),
    supabase
      .from("swap_requests")
      .select("offered_book_id")
      .in("status", ["pending", "accepted"])
      .eq("requester_id", user.id),
    // my_wishes view is scoped to auth.uid() and includes the owner's
    // first_name + availability, which is everything the match needs.
    supabase
      .from("my_wishes")
      .select("owner_id, owner_first_name, is_available"),
  ]);

  const inSwapIds = new Set<string>();
  asOwnerSwaps?.forEach((s) => inSwapIds.add(s.requested_book_id));
  asRequesterSwaps?.forEach((s) => inSwapIds.add(s.offered_book_id));

  const booksWithStatus = (books ?? []).map((b) => ({
    ...b,
    status: (inSwapIds.has(b.id)
      ? "in_swap"
      : b.is_available
        ? "available"
        : "not_listed") as BookStatus,
  }));

  const stats = {
    owned: booksWithStatus.length,
    available: booksWithStatus.filter((b) => b.status === "available").length,
    inSwap: booksWithStatus.filter((b) => b.status === "in_swap").length,
  };

  const hasBooks = booksWithStatus.length > 0;

  // --- Mutual heart match --------------------------------------------------
  // Group my wishes by owner (counting only available books, since those are
  // the ones I could actually propose for). Then ask: which of those owners
  // have hearted any of my available books? Pick the strongest mutual match.
  const topMatch = await computeTopMatch({
    myWishes: myWishes ?? [],
    myAvailableBookIds: booksWithStatus
      .filter((b) => b.status === "available")
      .map((b) => b.id),
  });

  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col p-6 pb-24 md:max-w-4xl md:pb-6">
      <header className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-medium tracking-tight">
          Library
        </h1>
        <div className="flex items-center gap-4">
          <Link
            href="/app/discover"
            className="hidden text-sm text-muted hover:text-ink md:inline"
          >
            Discover
          </Link>
          <Link
            href="/app/swaps"
            className="hidden text-sm text-muted hover:text-ink md:inline"
          >
            Swaps
          </Link>
          <Link
            href="/app/wishes"
            aria-label="Wishes"
            className="text-lg text-muted hover:text-ink"
          >
            ♡
          </Link>
          <Link
            href="/app/profile"
            aria-label="Profile"
            className="text-xl text-muted hover:text-ink"
          >
            ⚙︎
          </Link>
        </div>
      </header>

      {!profile?.first_name && (
        <div className="mt-6 space-y-2">
          <p className="text-sm text-muted">
            Set up your profile to get started.
          </p>
          <Link
            href="/app/profile"
            className="inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper"
          >
            Complete profile
          </Link>
        </div>
      )}

      {topMatch && <MatchBanner match={topMatch} />}

      {!hasBooks ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-md border border-dashed border-subtle bg-cream-dim/40 p-10 text-center">
          <p className="font-serif text-xl font-medium tracking-tight">
            Your library is empty
          </p>
          <p className="max-w-xs text-sm text-muted">
            Add books you&rsquo;re happy to swap. Search Open Library or type
            them in manually.
          </p>
          <Link
            href="/app/add"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper"
          >
            <span aria-hidden>＋</span> Add your first book
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-md bg-paper">
            <div className="flex items-center gap-8 border-b border-divider px-4 py-4">
              <Stat num={stats.owned} label="Owned" />
              <Stat num={stats.available} label="Available" />
              <Stat num={stats.inSwap} label="In swap" />
            </div>

            <ul className="md:grid md:grid-cols-2">
              {booksWithStatus.map((book, i) => {
                const len = booksWithStatus.length;
                // Last-row detection for md grid (2 cols): when len is even,
                // the last two items; when odd, just the last. Used to drop
                // the bottom border so the container closes cleanly.
                const isLastRowMd =
                  len % 2 === 0 ? i >= len - 2 : i === len - 1;
                // Right-column divider on left cells only, but not on a
                // trailing odd item that has no neighbor to its right.
                const hasRightNeighborMd = i % 2 === 0 && i !== len - 1;
                return (
                <li
                  key={book.id}
                  className={`relative flex items-start gap-3 border-b border-divider px-4 py-3 transition last:border-b-0 hover:bg-cream-dim/40 ${isLastRowMd ? "md:border-b-0" : ""} ${hasRightNeighborMd ? "md:border-r md:border-divider" : ""}`}
                >
                  {/*
                    Stretched link. Inner static content is pointer-events-none
                    so clicks fall through to this absolute-positioned link
                    (cursor: pointer everywhere). The pill wrapper below
                    re-enables pointer events so the availability toggle is
                    independently clickable.
                  */}
                  <Link
                    href={`/app/books/${book.id}`}
                    aria-label={`Edit ${book.title}`}
                    className="absolute inset-0 z-0"
                  />
                  <div className="pointer-events-none relative z-10">
                    <BookCover
                      cover_url={book.cover_url}
                      alt={book.title}
                      size="sm"
                    />
                  </div>
                  <div className="pointer-events-none relative z-10 min-w-0 flex-1 space-y-1">
                    <p className="line-clamp-2 font-serif text-sm font-medium leading-tight">
                      {book.title}
                    </p>
                    {book.author && (
                      <p className="line-clamp-1 text-xs text-muted">
                        {book.author}
                      </p>
                    )}
                    <div className="pointer-events-auto pt-1">
                      {book.status === "in_swap" ? (
                        <BookStatusPill status="in_swap" />
                      ) : (
                        <AvailabilityToggle
                          bookId={book.id}
                          isAvailable={book.is_available}
                        />
                      )}
                    </div>
                  </div>
                </li>
                );
              })}
            </ul>
          </div>

          {/* Desktop: inline "+ Add book" below list, keeps keyboard flow sane */}
          <div className="mt-6 hidden md:block">
            <Link
              href="/app/add"
              className="inline-flex items-center gap-2 rounded-md border border-subtle bg-paper px-3 py-2 text-sm font-medium hover:bg-cream-dim"
            >
              <span aria-hidden>＋</span> Add book
            </Link>
          </div>

          {/* Mobile: floating action button */}
          <Link
            href="/app/add"
            aria-label="Add book"
            className="fixed bottom-20 right-6 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-xl leading-none text-paper shadow-lg md:hidden"
          >
            <span aria-hidden>＋</span>
          </Link>
        </>
      )}
    </main>
  );
}

function Stat({ num, label }: { num: number; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-serif text-2xl font-medium leading-none tracking-tight">
        {num}
      </span>
      <span className="mt-1 font-mono text-[9px] font-medium uppercase tracking-widest text-muted">
        {label}
      </span>
    </div>
  );
}

type MyWishRow = {
  owner_id: string;
  owner_first_name: string | null;
  is_available: boolean;
};

async function computeTopMatch({
  myWishes,
  myAvailableBookIds,
}: {
  myWishes: MyWishRow[];
  myAvailableBookIds: string[];
}): Promise<Match | null> {
  if (myWishes.length === 0 || myAvailableBookIds.length === 0) return null;

  const byOwner = new Map<
    string,
    { first_name: string | null; they_have: number }
  >();
  for (const w of myWishes) {
    if (!w.is_available) continue;
    const e = byOwner.get(w.owner_id) ?? {
      first_name: w.owner_first_name,
      they_have: 0,
    };
    e.they_have += 1;
    byOwner.set(w.owner_id, e);
  }
  if (byOwner.size === 0) return null;

  // Admin client: book_wishes RLS hides other users' rows. We only ask about
  // specific owners (the ones I've already hearted books from) against my
  // specific book ids — the answer never leaves the server unbucketed.
  const admin = createAdminClient();
  const { data: theirWishesOnMine } = await admin
    .from("book_wishes")
    .select("user_id, book_id")
    .in("user_id", Array.from(byOwner.keys()))
    .in("book_id", myAvailableBookIds);

  const theyWantByUser = new Map<string, number>();
  for (const row of theirWishesOnMine ?? []) {
    theyWantByUser.set(
      row.user_id,
      (theyWantByUser.get(row.user_id) ?? 0) + 1,
    );
  }

  let best: Match | null = null;
  for (const [owner_id, v] of byOwner) {
    const they_want = theyWantByUser.get(owner_id) ?? 0;
    if (they_want === 0) continue; // one-sided: identity stays hidden
    const score = v.they_have + they_want;
    const bestScore = best ? best.they_have + best.they_want : -1;
    if (score > bestScore) {
      best = {
        owner_id,
        first_name: v.first_name,
        they_have: v.they_have,
        they_want,
      };
    }
  }
  return best;
}

function MatchBanner({ match }: { match: Match }) {
  const name = match.first_name ?? "Someone";
  const haveWord = match.they_have === 1 ? "book" : "books";
  const wantWord = match.they_want === 1 ? "book" : "books";
  return (
    <Link
      href={`/app/users/${match.owner_id}`}
      className="mt-6 block rounded-md border-l-2 border-accent bg-accent-soft px-3 py-2.5 text-sm leading-snug hover:bg-accent-soft/80"
    >
      <span className="font-medium">{name}</span> has{" "}
      <span className="font-medium">
        {match.they_have} {haveWord}
      </span>{" "}
      you&rsquo;ve hearted, and wants{" "}
      <span className="font-medium">
        {match.they_want} {wantWord}
      </span>{" "}
      of yours.
      <span className="mt-1 block font-mono text-[10px] font-medium uppercase tracking-widest text-accent">
        Propose a swap →
      </span>
    </Link>
  );
}
