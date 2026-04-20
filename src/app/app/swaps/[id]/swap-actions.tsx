"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SwapStatus } from "@/components/status-pill";

type Action = "accept" | "decline" | "cancel" | "complete";

const ERROR_COPY: Record<string, string> = {
  forbidden: "You can't perform this action on this swap.",
  state_changed: "This swap has already been updated. Refresh the page.",
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
        setError(
          ERROR_COPY[body.error ?? ""] ??
            body.message ??
            "Something went wrong.",
        );
        setPendingAction(null);
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
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
            >
              {pendingAction === "accept" ? "Accepting…" : "Accept"}
            </button>
            <button
              type="button"
              onClick={() => fire("decline")}
              disabled={busy}
              className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              {pendingAction === "decline" ? "Declining…" : "Decline"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fire("cancel")}
            disabled={busy}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
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
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
          >
            {pendingAction === "complete" ? "Marking…" : "Mark complete"}
          </button>
          <p className="text-xs text-neutral-500">
            Once marked, both books are set to unavailable. Do this after
            you&rsquo;ve actually handed the books over.
          </p>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
