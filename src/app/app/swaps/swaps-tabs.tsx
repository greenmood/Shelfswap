"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusPill, type SwapStatus } from "@/components/status-pill";

type BookRef = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
};

type ProfileRef = {
  first_name: string | null;
};

export type SwapRow = {
  id: string;
  status: SwapStatus;
  created_at: string;
  requester_id: string;
  owner_id: string;
  requested: BookRef | null;
  offered: BookRef | null;
  requester_profile: ProfileRef | null;
  owner_profile: ProfileRef | null;
};

type Tab = "incoming" | "outgoing";

export function SwapsTabs({
  incoming,
  outgoing,
}: {
  incoming: SwapRow[];
  outgoing: SwapRow[];
}) {
  const [tab, setTab] = useState<Tab>("incoming");
  const list = tab === "incoming" ? incoming : outgoing;

  return (
    <div className="mt-6 space-y-4">
      {/* Segmented control */}
      <div
        role="tablist"
        className="grid grid-cols-2 gap-1 rounded-md bg-cream-dim p-1"
      >
        <SegItem
          label="Incoming"
          count={incoming.length}
          active={tab === "incoming"}
          onClick={() => setTab("incoming")}
        />
        <SegItem
          label="Outgoing"
          count={outgoing.length}
          active={tab === "outgoing"}
          onClick={() => setTab("outgoing")}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <ul className="space-y-3">
          {list.map((swap) => (
            <SwapCard key={swap.id} swap={swap} tab={tab} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SegItem({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded py-1.5 font-mono text-[11px] font-medium uppercase tracking-widest transition ${
        active
          ? "bg-paper text-ink shadow-sm"
          : "text-muted hover:text-ink"
      }`}
    >
      {label} · {count}
    </button>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  const copy =
    tab === "incoming"
      ? {
          title: "No requests yet",
          sub: "When someone wants one of your books, it'll show up here.",
        }
      : {
          title: "No proposals yet",
          sub: "Find a book you want on Discover and propose a swap.",
        };

  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-subtle bg-cream-dim/40 p-10 text-center">
      <p className="font-serif text-xl font-medium tracking-tight">
        {copy.title}
      </p>
      <p className="max-w-xs text-sm text-muted">{copy.sub}</p>
      {tab === "outgoing" && (
        <Link
          href="/app/discover"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper"
        >
          Browse Discover
        </Link>
      )}
    </div>
  );
}

function SwapCard({ swap, tab }: { swap: SwapRow; tab: Tab }) {
  const otherName =
    tab === "incoming"
      ? (swap.requester_profile?.first_name ?? "someone")
      : (swap.owner_profile?.first_name ?? "someone");

  // Incoming + pending is the "someone just asked" moment. Every other state
  // gets the flat "with {name}" because the status pill carries the action.
  const whoCopy =
    tab === "incoming" && swap.status === "pending" ? (
      <>
        <strong className="font-semibold">{otherName}</strong> wants to swap
      </>
    ) : (
      <>
        with <strong className="font-semibold">{otherName}</strong>
      </>
    );

  const isAccepted = swap.status === "accepted";

  return (
    <li>
      <Link
        href={`/app/swaps/${swap.id}`}
        className={`block rounded-md border p-3 transition hover:border-ink ${
          isAccepted
            ? "border-accepted-fg bg-gradient-to-b from-accepted-bg to-paper"
            : "border-subtle bg-paper"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm text-ink">{whoCopy}</p>
          <StatusPill status={swap.status} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <SwapHalf book={swap.requested} />
          <span
            aria-hidden
            className="shrink-0 font-mono text-xs text-muted"
          >
            ⇄
          </span>
          <SwapHalf book={swap.offered} />
        </div>
      </Link>
    </li>
  );
}

function SwapHalf({ book }: { book: BookRef | null }) {
  const title = book?.title ?? "Unknown book";
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate font-serif text-xs font-medium leading-tight">
        {title}
      </p>
      {book?.author && (
        <p className="truncate text-[10.5px] text-muted">{book.author}</p>
      )}
    </div>
  );
}
