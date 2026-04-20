"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SwapStatus } from "@/components/status-pill";

type Action = "accept" | "decline" | "cancel" | "complete";

// Client-side fallbacks by error code. The server's `message` field is
// preferred when specific (e.g., "This swap is cancelled — can't accept.");
// these entries only apply when no per-instance message came back.
const ERROR_COPY: Record<string, string> = {
  forbidden: "You can't perform this action on this swap.",
  invalid_action: "Unknown action.",
  not_found: "Swap not found.",
  unauthorized: "Sign in first.",
};

export function SwapActions({
  swapId,
  status,
  role,
}: {
  swapId: string;
  status: SwapStatus;
  role: "owner" | "requester";
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // pending → accept/decline (owner) or cancel (requester)
  // accepted → complete (either)
  // declined/cancelled/completed → no further actions
  if (status !== "pending" && status !== "accepted") return null;

  function fire(action: Action) {
    setError(null);
    setPendingAction(action);
    startTransition(async () => {
      const res = await fetch(`/api/swaps/${swapId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        // Prefer the server's specific message (e.g. "This swap is
        // cancelled — can't accept."). Fall back to a code-based copy.
        setError(
          body.message ??
            ERROR_COPY[body.error ?? ""] ??
            "Something went wrong.",
        );
        setPendingAction(null);

        // Auto-recover on contested transitions: re-run the server
        // component so pill, copy, and actions reflect the actual current
        // status. Without this, the user sees stale "Accept" buttons on
        // an already-cancelled swap and has to manually refresh.
        if (body.error === "state_changed") {
          router.refresh();
        }
        return;
      }

      router.refresh();
      setPendingAction(null);
    });
  }

  const busy = pendingAction !== null;

  return (
    <div className="mt-6 space-y-3">
      {status === "pending" ? (
        role === "owner" ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fire("accept")}
              disabled={busy}
              className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50 dark:bg-paper dark:text-ink"
            >
              {pendingAction === "accept" ? "Accepting…" : "Accept"}
            </button>
            <button
              type="button"
              onClick={() => fire("decline")}
              disabled={busy}
              className="rounded-md border border-subtle px-4 py-2 text-sm font-medium hover:bg-cream-dim disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-ink"
            >
              {pendingAction === "decline" ? "Declining…" : "Decline"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fire("cancel")}
            disabled={busy}
            className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {pendingAction === "cancel" ? "Cancelling…" : "Cancel swap"}
          </button>
        )
      ) : (
        // status === "accepted" — either party can mark complete
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => fire("complete")}
            disabled={busy}
            className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper disabled:opacity-50 dark:bg-paper dark:text-ink"
          >
            {pendingAction === "complete" ? "Marking…" : "Mark complete"}
          </button>
          <p className="text-xs text-muted">
            Once marked, both books are set to unavailable. Do this after
            you&rsquo;ve actually handed the books over.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
