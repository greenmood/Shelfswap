"use client";

import { useState, useTransition, type MouseEvent } from "react";

export function HeartButton({
  bookId,
  initialWished,
  size = "md",
  onToggle,
}: {
  bookId: string;
  initialWished: boolean;
  size?: "sm" | "md";
  onToggle?: (wished: boolean) => void;
}) {
  const [wished, setWished] = useState(initialWished);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    // Most hearts sit next to a <Link> for the row — keep the click local.
    e.preventDefault();
    e.stopPropagation();

    const next = !wished;
    setWished(next);
    onToggle?.(next);
    setError(null);

    startTransition(async () => {
      try {
        const res = next
          ? await fetch("/api/wishes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ book_id: bookId }),
            })
          : await fetch(`/api/wishes/${bookId}`, { method: "DELETE" });

        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            message?: string;
          };
          throw new Error(body.message ?? "Request failed");
        }
      } catch (err) {
        setWished(!next);
        onToggle?.(!next);
        setError((err as Error).message);
      }
    });
  }

  const dims = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={wished}
      aria-label={wished ? "Remove from wishes" : "Add to wishes"}
      title={error ?? undefined}
      className={`-m-2 inline-flex shrink-0 items-center justify-center p-2 transition ${
        wished ? "text-accent" : "text-muted hover:text-ink"
      } disabled:opacity-60`}
    >
      <svg
        viewBox="0 0 24 24"
        className={dims}
        stroke="currentColor"
        strokeWidth={1.5}
        fill={wished ? "currentColor" : "none"}
        aria-hidden
      >
        <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6C19 16.5 12 21 12 21z" />
      </svg>
    </button>
  );
}
