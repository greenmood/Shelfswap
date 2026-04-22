"use client";

import { useState } from "react";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { HeartButton } from "@/components/heart-button";

export type Wish = {
  book_id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  condition: "good" | "worn";
  is_available: boolean;
  owner_id: string;
  owner_first_name: string | null;
  wished_at: string;
};

export function WishesList({ initial }: { initial: Wish[] }) {
  const [items, setItems] = useState<Wish[]>(initial);

  function onHeartToggle(bookId: string, wished: boolean) {
    // Unhearting removes the row. No undo — re-heart from Discover if needed.
    if (!wished) {
      setItems((prev) => prev.filter((w) => w.book_id !== bookId));
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center gap-2 rounded-md border border-dashed border-subtle bg-cream-dim/40 p-10 text-center">
        <p className="font-serif text-xl font-medium tracking-tight">
          No wishes yet
        </p>
        <p className="max-w-xs text-sm text-muted">
          Tap the heart on any book in Discover to save it here.
        </p>
        <Link
          href="/app/discover"
          className="mt-4 inline-flex items-center rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper"
        >
          Browse Discover
        </Link>
      </div>
    );
  }

  return (
    <ul className="mt-6 overflow-hidden rounded-md bg-paper">
      {items.map((wish) => (
        <li
          key={wish.book_id}
          className="flex items-start gap-3 border-b border-divider px-4 py-3 last:border-b-0"
        >
          {/* Book detail page filters on is_available, so only link when the
              book is currently swappable. Unavailable rows stay static. */}
          {wish.is_available ? (
            <Link
              href={`/app/discover/books/${wish.book_id}`}
              className="flex min-w-0 flex-1 items-start gap-3 hover:opacity-80"
            >
              <WishBody wish={wish} />
            </Link>
          ) : (
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <WishBody wish={wish} />
            </div>
          )}

          <div className="flex flex-col items-end gap-2">
            <HeartButton
              bookId={wish.book_id}
              initialWished={true}
              onToggle={(w) => onHeartToggle(wish.book_id, w)}
            />
            {wish.is_available ? (
              <Link
                href={`/app/discover/books/${wish.book_id}/propose`}
                className="font-mono text-[10px] font-medium uppercase tracking-widest text-accent hover:text-ink"
              >
                Propose →
              </Link>
            ) : (
              <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
                Unavailable
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function WishBody({ wish }: { wish: Wish }) {
  return (
    <>
      <BookCover cover_url={wish.cover_url} alt={wish.title} size="sm" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="line-clamp-2 font-serif text-sm font-medium leading-tight">
          {wish.title}
        </p>
        {wish.author && (
          <p className="line-clamp-1 text-xs text-muted">{wish.author}</p>
        )}
        <p className="pt-0.5 font-mono text-[10px] text-muted">
          {wish.owner_first_name ?? "someone"} ·{" "}
          {wish.condition === "good" ? "Good" : "Worn"}
        </p>
      </div>
    </>
  );
}
