"use client";

import { useState, useTransition } from "react";
import { setAvailability } from "./actions";

export function AvailabilityToggle({
  bookId,
  isAvailable,
}: {
  bookId: string;
  isAvailable: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await setAvailability(bookId, !isAvailable);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const base =
    "shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-widest transition hover:opacity-80 disabled:opacity-50";
  const palette = isAvailable
    ? "bg-accepted-bg text-accepted-fg dark:bg-emerald-950 dark:text-emerald-300"
    : "bg-divider text-muted dark:bg-neutral-800 dark:text-muted";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={isAvailable}
        aria-label={
          isAvailable ? "Mark as unavailable" : "Mark as available"
        }
        className={`${base} ${palette}`}
      >
        {isAvailable ? "Available" : "Unavailable"}
      </button>
      {error && (
        <span className="text-[10px] text-red-600" role="status">
          {error}
        </span>
      )}
    </div>
  );
}
