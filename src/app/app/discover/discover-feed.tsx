"use client";

import { useState, useTransition } from "react";
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

export function DiscoverFeed({
  initial,
  currentUserId,
}: {
  initial: DiscoverBook[];
  currentUserId: string;
}) {
  const [items, setItems] = useState<DiscoverBook[]>(initial);
  const [hasMore, setHasMore] = useState(initial.length === PAGE_SIZE);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const cursor = items[items.length - 1]?.created_at;
      if (!cursor) return;

      const { data, error: err } = await supabase
        .from("discoverable_books")
        .select(
          "id, title, author, cover_url, condition, owner_id, owner_first_name, created_at",
        )
        .not("owner_id", "eq", currentUserId)
        .lt("created_at", cursor)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (err) {
        setError(err.message);
        return;
      }

      const next = (data ?? []) as DiscoverBook[];
      setItems([...items, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    });
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 rounded-md border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
        <p className="text-base font-medium">Nothing to discover yet</p>
        <p className="text-sm text-neutral-500">
          When someone else adds books, they&rsquo;ll show up here.
        </p>
      </div>
    );
  }

  return (
    <>
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
              <p className="line-clamp-2 text-sm font-medium">{book.title}</p>
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

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={isPending}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
          >
            {isPending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      )}
    </>
  );
}
