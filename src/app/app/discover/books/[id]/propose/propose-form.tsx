"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";

type MyBook = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  locked: boolean;
};

type SwapError = {
  error: string;
  message?: string;
};

const ERROR_COPY: Record<string, string> = {
  offered_not_yours: "You can only offer books from your own library.",
  requested_is_yours: "You can't request your own book.",
  not_available: "One of the books is no longer available.",
  duplicate_pending: "You already have an open swap for this pair.",
  same_book: "Requested and offered books must be different.",
  unauthorized: "Sign in to propose a swap.",
};

export function ProposeForm({
  requestedBookId,
  myBooks,
}: {
  requestedBookId: string;
  myBooks: MyBook[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);

    startTransition(async () => {
      const res = await fetch("/api/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requested_book_id: requestedBookId,
          offered_book_id: selectedId,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as SwapError;
        const msg =
          ERROR_COPY[body.error] ??
          body.message ??
          "Something went wrong. Try again.";
        setError(msg);
        return;
      }

      setSuccess(true);
    });
  }

  const allLocked = myBooks.every((b) => b.locked);

  if (!success && allLocked) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-subtle p-6 text-center dark:border-neutral-700">
        <p className="text-sm font-medium">
          You&rsquo;ve already proposed every book
        </p>
        <p className="text-sm text-muted">
          Each of your available books is in an open swap for this one. Wait
          for one to resolve or add a new book.
        </p>
        <Link
          href="/app/discover"
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-cream-dim dark:border-neutral-700 dark:hover:bg-ink"
        >
          Back to Discover
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-subtle bg-accepted-bg p-6 text-center dark:border-emerald-900 dark:bg-emerald-950">
        <p className="text-sm font-medium text-accepted-fg dark:text-emerald-300">
          Swap proposed
        </p>
        <p className="text-sm text-muted dark:text-muted">
          The owner will be notified. You&rsquo;ll see it under My Swaps.
        </p>
        <Link
          href="/app/discover"
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-cream-dim dark:border-neutral-700 dark:hover:bg-ink"
        >
          Back to Discover
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ul className="space-y-2">
        {myBooks.map((book) => {
          const isLocked = book.locked;
          const isSelected = selectedId === book.id;
          return (
            <li key={book.id}>
              <label
                className={`flex items-start gap-3 rounded-md border p-3 ${
                  isLocked
                    ? "cursor-not-allowed border-subtle opacity-50 dark:border-neutral-800"
                    : "cursor-pointer"
                } ${
                  !isLocked && isSelected
                    ? "border-ink dark:border-white"
                    : !isLocked
                      ? "border-subtle dark:border-neutral-800"
                      : ""
                }`}
              >
                <input
                  type="radio"
                  name="offered"
                  value={book.id}
                  checked={isSelected}
                  onChange={() => setSelectedId(book.id)}
                  disabled={isLocked}
                  className="mt-1"
                />
                <BookCover
                  cover_url={book.cover_url}
                  alt={book.title}
                  size="sm"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="line-clamp-2 text-sm font-medium">
                    {book.title}
                  </p>
                  {book.author && (
                    <p className="line-clamp-1 text-xs text-muted">
                      {book.author}
                    </p>
                  )}
                  {isLocked && (
                    <p className="text-xs text-muted">
                      Already in an open swap for this book.
                    </p>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!selectedId || isSubmitting}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50 dark:bg-paper dark:text-ink"
        >
          {isSubmitting ? "Proposing…" : "Propose swap"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
