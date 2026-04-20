"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { RadioDot } from "@/components/radio-dot";

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
      <div className="mt-3 flex flex-col items-center gap-3 rounded-md border border-dashed border-subtle bg-cream-dim/40 p-6 text-center">
        <p className="font-serif text-base font-medium">
          You&rsquo;ve already proposed every book
        </p>
        <p className="max-w-xs text-sm text-muted">
          Each of your available books is in an open swap for this one. Wait
          for one to resolve or add a new book.
        </p>
        <Link
          href="/app/discover"
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-subtle bg-paper px-4 py-2 text-sm font-medium hover:bg-cream-dim"
        >
          Back to Discover
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="mt-3 flex flex-col items-center gap-3 rounded-md border border-subtle bg-accepted-bg p-6 text-center">
        <p className="font-serif text-base font-medium text-accepted-fg">
          Swap proposed
        </p>
        <p className="max-w-xs text-sm text-muted">
          The owner will be notified. You&rsquo;ll see it under My Swaps.
        </p>
        <Link
          href="/app/discover"
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-subtle bg-paper px-4 py-2 text-sm font-medium hover:bg-cream-dim"
        >
          Back to Discover
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-6">
      <ul className="overflow-hidden rounded-md bg-paper">
        {myBooks.map((book) => {
          const isLocked = book.locked;
          const isSelected = selectedId === book.id;
          return (
            <li
              key={book.id}
              className="border-b border-divider last:border-b-0"
            >
              <label
                className={`flex items-center gap-3 px-4 py-3 transition ${
                  isLocked
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer hover:bg-cream-dim/40"
                }`}
              >
                <input
                  type="radio"
                  name="offered"
                  value={book.id}
                  checked={isSelected}
                  onChange={() => setSelectedId(book.id)}
                  disabled={isLocked}
                  className="sr-only"
                />
                <RadioDot checked={isSelected} />
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
                  {isLocked && (
                    <p className="pt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                      Already in an open swap
                    </p>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={!selectedId || isSubmitting}
          className="w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-50"
        >
          {isSubmitting ? "Sending…" : "Send request"}
        </button>
        {error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}
      </div>
    </form>
  );
}
