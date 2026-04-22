"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
import { RadioDot } from "@/components/radio-dot";
import type {
  SuggestionBook,
  SuggestionBuckets,
} from "@/lib/propose-suggestions";

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
  suggestions,
  ownerFirstName,
}: {
  requestedBookId: string;
  suggestions: SuggestionBuckets;
  ownerFirstName: string | null;
}) {
  const ownerName = ownerFirstName ?? "The owner";

  // Preselect the first non-locked wanted → likely → other row.
  const initialSelected =
    firstSelectable(suggestions.wanted) ??
    firstSelectable(suggestions.likely) ??
    firstSelectable(suggestions.other) ??
    null;

  const [selectedId, setSelectedId] = useState<string | null>(initialSelected);
  // Auto-expand "Your other books" when there's nothing above it; otherwise
  // let the user opt in.
  const [otherExpanded, setOtherExpanded] = useState(
    suggestions.wanted.length === 0 && suggestions.likely.length === 0,
  );
  const [isSubmitting, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const total =
    suggestions.wanted.length +
    suggestions.likely.length +
    suggestions.other.length;

  const allLocked =
    total > 0 &&
    suggestions.wanted.every((b) => b.locked) &&
    suggestions.likely.every((b) => b.locked) &&
    suggestions.other.every((b) => b.locked);

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
    <form onSubmit={handleSubmit} className="mt-4 space-y-5">
      {suggestions.wanted.length > 0 && (
        <Section
          heading="They want these"
          count={suggestions.wanted.length}
          books={suggestions.wanted}
          selectedId={selectedId}
          onSelect={setSelectedId}
          badgeFor={() => `${ownerName} wished for this`}
          badgeTone="accent"
        />
      )}

      {suggestions.likely.length > 0 && (
        <Section
          heading="Likely matches"
          count={suggestions.likely.length}
          books={suggestions.likely}
          selectedId={selectedId}
          onSelect={setSelectedId}
          badgeFor={(b) => likelyReason(b, ownerName)}
          badgeTone="muted"
        />
      )}

      {suggestions.other.length > 0 && (
        <Section
          heading="Your other books"
          count={suggestions.other.length}
          books={suggestions.other}
          selectedId={selectedId}
          onSelect={setSelectedId}
          collapsible
          expanded={otherExpanded}
          onToggle={() => setOtherExpanded((x) => !x)}
        />
      )}

      <div className="space-y-3 pt-2">
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

function firstSelectable(books: SuggestionBook[]): string | null {
  return books.find((b) => !b.locked)?.id ?? null;
}

function likelyReason(book: SuggestionBook, ownerName: string): string {
  if (book.match_author) return `${ownerName} likes ${book.match_author}`;
  if (book.match_title) return `${ownerName} wished for this title`;
  return "";
}

function Section({
  heading,
  count,
  books,
  selectedId,
  onSelect,
  collapsible,
  expanded,
  onToggle,
  badgeFor,
  badgeTone,
}: {
  heading: string;
  count: number;
  books: SuggestionBook[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  badgeFor?: (book: SuggestionBook) => string;
  badgeTone?: "accent" | "muted";
}) {
  const isOpen = collapsible ? (expanded ?? false) : true;

  return (
    <section>
      <div className="flex items-baseline justify-between pb-1">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink">
          {heading}
          <span className="ml-2 font-normal text-muted">{count}</span>
        </span>
        {collapsible && (
          <button
            type="button"
            onClick={onToggle}
            className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted hover:text-ink"
          >
            {isOpen ? "Hide ▴" : "Show ▾"}
          </button>
        )}
      </div>

      {isOpen && (
        <ul className="overflow-hidden rounded-md bg-paper">
          {books.map((book) => {
            const isSelected = selectedId === book.id;
            const badge = badgeFor?.(book);
            return (
              <li
                key={book.id}
                className="border-b border-divider last:border-b-0"
              >
                <label
                  className={`flex items-center gap-3 px-4 py-3 transition ${
                    book.locked
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer hover:bg-cream-dim/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="offered"
                    value={book.id}
                    checked={isSelected}
                    onChange={() => onSelect(book.id)}
                    disabled={book.locked}
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
                    {book.locked ? (
                      <p className="pt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
                        Already in an open swap
                      </p>
                    ) : badge ? (
                      <p
                        className={`pt-0.5 font-mono text-[10px] uppercase tracking-widest ${
                          badgeTone === "accent"
                            ? "text-accent"
                            : "text-muted"
                        }`}
                      >
                        <span aria-hidden>♥</span> {badge}
                      </p>
                    ) : null}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
