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
    "inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-widest transition hover:opacity-80 disabled:opacity-50";
  const palette = isAvailable
    ? "bg-accent-soft text-accent"
    : "bg-cream-dim text-muted";

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        aria-pressed={isAvailable}
        aria-label={
          isAvailable ? "Mark as not listed" : "Mark as available"
        }
        className={`${base} ${palette}`}
      >
        {isAvailable ? "Available" : "Not listed"}
      </button>
      {error && (
        <span className="text-[10px] text-red-600" role="status">
          {error}
        </span>
      )}
    </div>
  );
}
