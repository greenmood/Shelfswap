import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { BookCover } from "@/components/book-cover";
import {
  BookStatusPill,
  type BookStatus,
} from "@/components/book-status-pill";
import { AvailabilityToggle } from "./availability-toggle";

export default async function AppHome() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const supabase = await createClient();

  // In parallel: profile, books, and the two slices of active-swap book IDs.
  // A book is "in swap" if it appears on either side of a pending/accepted
  // swap where I'm the corresponding party.
  const [
    { data: profile },
    { data: books },
    { data: asOwnerSwaps },
    { data: asRequesterSwaps },
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

  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col p-6 pb-24 md:max-w-lg md:pb-6">
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

            <ul>
              {booksWithStatus.map((book) => (
                <li
                  key={book.id}
                  className="relative flex items-start gap-3 border-b border-divider px-4 py-3 last:border-b-0"
                >
                  {/* Stretched link covers the whole row for edit navigation */}
                  <Link
                    href={`/app/books/${book.id}`}
                    aria-label={`Edit ${book.title}`}
                    className="absolute inset-0"
                  />
                  <div className="relative z-10">
                    <BookCover
                      cover_url={book.cover_url}
                      alt={book.title}
                      size="sm"
                    />
                  </div>
                  <div className="relative z-10 min-w-0 flex-1 space-y-1">
                    <p className="line-clamp-2 font-serif text-sm font-medium leading-tight">
                      {book.title}
                    </p>
                    {book.author && (
                      <p className="line-clamp-1 text-xs text-muted">
                        {book.author}
                      </p>
                    )}
                    <div className="pt-1">
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
              ))}
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
