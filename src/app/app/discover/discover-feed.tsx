"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { HeartButton } from "@/components/heart-button";
import { createClient } from "@/lib/supabase/client";

export const PAGE_SIZE = 20;

type DiscoverBook = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  condition: "good" | "worn";
  owner_id: string;
  owner_first_name: string | null;
  created_at: string;
};

// Strip chars that would break PostgREST's .or() filter grammar (commas,
// parentheses). Users don't type these in book search anyway.
function sanitizeForOr(raw: string): string {
  return raw.replace(/[,()]/g, " ").replace(/\s+/g, " ").trim();
}

export function DiscoverFeed({
  initial,
  currentUserId,
  initialWishedBookIds,
}: {
  initial: DiscoverBook[];
  currentUserId: string;
  initialWishedBookIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DiscoverBook[]>(initial);
  const [hasMore, setHasMore] = useState(initial.length === PAGE_SIZE);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, startLoadMore] = useTransition();

  // Lift the wish set so a heart toggled in one row stays correct if the list
  // refetches (search, pagination) and that same book re-appears.
  const [wishedIds, setWishedIds] = useState<Set<string>>(
    () => new Set(initialWishedBookIds),
  );
  function onHeartToggle(bookId: string, wished: boolean) {
    setWishedIds((prev) => {
      const next = new Set(prev);
      if (wished) next.add(bookId);
      else next.delete(bookId);
      return next;
    });
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function fetchPage(opts: {
    search?: string;
    cursor?: string;
  }): Promise<DiscoverBook[]> {
    const supabase = createClient();
    let q = supabase
      .from("discoverable_books")
      .select(
        "id, title, author, cover_url, condition, owner_id, owner_first_name, created_at",
      )
      .not("owner_id", "eq", currentUserId);

    if (opts.search) {
      const safe = sanitizeForOr(opts.search);
      if (safe) {
        q = q.or(`title.ilike.%${safe}%,author.ilike.%${safe}%`);
      }
    }
    if (opts.cursor) {
      q = q.lt("created_at", opts.cursor);
    }

    const { data, error: err } = await q
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (err) throw new Error(err.message);
    return (data ?? []) as DiscoverBook[];
  }

  function onQueryChange(value: string) {
    setQuery(value);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsSearching(true);
      try {
        const trimmed = value.trim();
        const page = await fetchPage({
          search: trimmed.length >= 2 ? trimmed : undefined,
        });
        if (!controller.signal.aborted) {
          setItems(page);
          setHasMore(page.length === PAGE_SIZE);
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }

  function loadMore() {
    setError(null);
    startLoadMore(async () => {
      const cursor = items[items.length - 1]?.created_at;
      if (!cursor) return;

      try {
        const trimmed = query.trim();
        const next = await fetchPage({
          search: trimmed.length >= 2 ? trimmed : undefined,
          cursor,
        });
        setItems([...items, ...next]);
        setHasMore(next.length === PAGE_SIZE);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const trimmed = query.trim();
  const isSearch = trimmed.length >= 2;
  const noMatches = items.length === 0 && !isSearching && isSearch;
  const emptyFeed = items.length === 0 && !isSearching && !isSearch;

  // "N available" when browsing, "N match(es)" when searching.
  const counterLabel =
    items.length === 1
      ? isSearch
        ? "1 match"
        : "1 available"
      : isSearch
        ? `${items.length} matches`
        : `${items.length} available`;

  return (
    <>
      <div className="mt-6">
        <SearchField value={query} onChange={onQueryChange} />
      </div>

      {!emptyFeed && !noMatches && (
        <p className="mt-4 font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
          {isSearching ? "Searching…" : counterLabel}
        </p>
      )}

      {emptyFeed && (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-md border border-dashed border-subtle bg-cream-dim/40 p-10 text-center">
          <p className="font-serif text-xl font-medium tracking-tight">
            Nothing to discover yet
          </p>
          <p className="max-w-xs text-sm text-muted">
            When other people add books, they&rsquo;ll show up here. Check
            back soon.
          </p>
        </div>
      )}

      {noMatches && (
        <p className="mt-6 text-sm text-muted">
          No matches for &ldquo;{trimmed}&rdquo;.
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-3 overflow-hidden rounded-md bg-paper">
          {items.map((book) => (
            <li
              key={book.id}
              className="flex items-start gap-3 border-b border-divider px-4 py-3 last:border-b-0 hover:bg-cream-dim/40"
            >
              <Link
                href={`/app/discover/books/${book.id}`}
                className="flex min-w-0 flex-1 items-start gap-3"
              >
                <BookCover
                  cover_url={book.cover_url}
                  alt={book.title}
                  size="sm"
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="line-clamp-2 font-serif text-sm font-medium leading-tight">
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="line-clamp-1 text-xs text-muted">
                      {book.author}
                    </p>
                  )}
                  <p className="pt-0.5 font-mono text-[10px] text-muted">
                    {book.owner_first_name ?? "someone"} ·{" "}
                    {book.condition === "good" ? "Good" : "Worn"}
                  </p>
                </div>
              </Link>
              <HeartButton
                bookId={book.id}
                initialWished={wishedIds.has(book.id)}
                onToggle={(w) => onHeartToggle(book.id, w)}
              />
            </li>
          ))}
        </ul>
      )}

      {items.length > 0 && hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="rounded-md border border-subtle bg-paper px-4 py-2 text-sm font-medium hover:bg-cream-dim disabled:opacity-50"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      )}
    </>
  );
}

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base text-muted"
      >
        ⌕
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search title or author…"
        className="w-full rounded-md border border-subtle bg-paper py-2 pl-9 pr-3 text-sm outline-none focus:border-ink"
      />
    </div>
  );
}
