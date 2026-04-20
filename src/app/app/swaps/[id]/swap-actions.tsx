"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SwapStatus } from "@/components/status-pill";

type Action = "accept" | "decline" | "cancel" | "complete";

// Client-side fallbacks by error code. Server's `message` is preferred.
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
  // accepted → complete (either) or cancel (either)
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
          body.message ??
            ERROR_COPY[body.error ?? ""] ??
            "Something went wrong.",
        );
        setPendingAction(null);
        if (body.error === "state_changed") router.refresh();
        return;
      }

      router.refresh();
      setPendingAction(null);
    });
  }

  const busy = pendingAction !== null;

  return (
    <div className="mt-auto space-y-3 pt-8">
      {status === "pending" && role === "owner" && (
        <>
          <PrimaryButton
            onClick={() => fire("accept")}
            busy={busy}
            loading={pendingAction === "accept"}
            label="Accept"
            loadingLabel="Accepting…"
          />
          <GhostButton
            onClick={() => fire("decline")}
            busy={busy}
            loading={pendingAction === "decline"}
            label="Decline"
            loadingLabel="Declining…"
          />
        </>
      )}

      {status === "pending" && role === "requester" && (
        <DangerButton
          onClick={() => fire("cancel")}
          busy={busy}
          loading={pendingAction === "cancel"}
          label="Cancel swap"
          loadingLabel="Cancelling…"
        />
      )}

      {status === "accepted" && (
        <>
          <PrimaryButton
            onClick={() => fire("complete")}
            busy={busy}
            loading={pendingAction === "complete"}
            label="Mark complete"
            loadingLabel="Marking…"
          />
          <p className="text-center font-mono text-[10px] tracking-widest text-muted">
            Mark complete after you&rsquo;ve handed the books over.
          </p>
        </>
      )}

      {error && (
        <p className="text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

type ActionProps = {
  onClick: () => void;
  busy: boolean;
  loading: boolean;
  label: string;
  loadingLabel: string;
};

function PrimaryButton({ onClick, busy, loading, label, loadingLabel }: ActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full rounded-md bg-ink px-4 py-3 text-sm font-medium text-paper disabled:opacity-50"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

function GhostButton({ onClick, busy, loading, label, loadingLabel }: ActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full rounded-md border border-subtle bg-paper px-4 py-3 text-sm font-medium hover:bg-cream-dim disabled:opacity-50"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

function DangerButton({ onClick, busy, loading, label, loadingLabel }: ActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
