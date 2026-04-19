"use client";

import { useRef, useState, useTransition } from "react";
import { BookCover } from "@/components/book-cover";
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
}: {
  initial: DiscoverBook[];
  currentUserId: string;
}) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DiscoverBook[]>(initial);
  const [hasMore, setHasMore] = useState(initial.length === PAGE_SIZE);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, startLoadMore] = useTransition();

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
  const noMatches =
    items.length === 0 && !isSearching && trimmed.length >= 2;
  const emptyFeed =
    items.length === 0 && !isSearching && trimmed.length < 2;

  return (
    <>
      <div className="mt-6">
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search title or author…"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-900"
        />
      </div>

      {isSearching && (
        <p className="mt-4 text-sm text-neutral-500">Searching…</p>
      )}

      {emptyFeed && (
        <div className="mt-8 flex flex-col items-center gap-3 rounded-md border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
          <p className="text-base font-medium">Nothing to discover yet</p>
          <p className="text-sm text-neutral-500">
            When someone else adds books, they&rsquo;ll show up here.
          </p>
        </div>
      )}

      {noMatches && (
        <p className="mt-6 text-sm text-neutral-500">
          No matches for &ldquo;{trimmed}&rdquo;.
        </p>
      )}

      {items.length > 0 && (
        <ul className="mt-6 space-y-2">
          {items.map((book) => (
            <li
              key={book.id}
              className="flex items-start gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
            >
              <BookCover
                cover_url={book.cover_url}
                alt={book.title}
                size="md"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="line-clamp-2 text-sm font-medium">
                  {book.title}
                </p>
                {book.author && (
                  <p className="line-clamp-1 text-xs text-neutral-500">
                    {book.author}
                  </p>
                )}
                <p className="text-xs text-neutral-500">
                  From{" "}
                  <span className="font-medium">
                    {book.owner_first_name ?? "someone"}
                  </span>{" "}
                  · {book.condition === "good" ? "Good" : "Worn"}
                </p>
              </div>
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
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
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
