"use client";

import { useState } from "react";
import Link from "next/link";
import { BookCover } from "@/components/book-cover";
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
  // Embeds can be null if the referenced row is missing or filtered by RLS.
  // We use admin client to avoid RLS filtering, but keep the types honest.
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
      <div
        role="tablist"
        className="grid grid-cols-2 rounded-md border border-subtle p-1 text-sm dark:border-neutral-800"
      >
        <TabButton
          label="Incoming"
          count={incoming.length}
          active={tab === "incoming"}
          onClick={() => setTab("incoming")}
        />
        <TabButton
          label="Outgoing"
          count={outgoing.length}
          active={tab === "outgoing"}
          onClick={() => setTab("outgoing")}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState tab={tab} />
      ) : (
        <ul className="space-y-2">
          {list.map((swap) => (
            <SwapItem key={swap.id} swap={swap} tab={tab} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TabButton({
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
      className={`rounded px-3 py-1.5 font-medium transition ${
        active
          ? "bg-ink text-paper dark:bg-paper dark:text-ink"
          : "text-muted hover:text-ink dark:hover:text-neutral-100"
      }`}
    >
      {label}{" "}
      <span className="text-xs opacity-75">({count})</span>
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

function SwapItem({ swap, tab }: { swap: SwapRow; tab: Tab }) {
  // Belt-and-suspenders: if an embed ever returns null (e.g., book deleted
  // outside the cascade path), fall back to a placeholder so the page
  // doesn't crash.
  const requestedTitle = swap.requested?.title ?? "Unknown book";
  const requestedAuthor = swap.requested?.author ?? null;
  const requestedCover = swap.requested?.cover_url ?? null;
  const offeredTitle = swap.offered?.title ?? "Unknown book";

  const otherName =
    tab === "incoming"
      ? (swap.requester_profile?.first_name ?? "someone")
      : (swap.owner_profile?.first_name ?? "someone");

  return (
    <li>
      <Link
        href={`/app/swaps/${swap.id}`}
        className="flex items-start gap-3 rounded-md border border-subtle p-3 hover:border-ink dark:border-neutral-800 dark:hover:border-neutral-600"
      >
        <BookCover cover_url={requestedCover} alt={requestedTitle} size="md" />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-2 text-sm font-medium">{requestedTitle}</p>
          {requestedAuthor && (
            <p className="line-clamp-1 text-xs text-muted">
              {requestedAuthor}
            </p>
          )}
          <p className="text-xs text-muted">
            {tab === "incoming" ? "From " : "To "}
            <span className="font-medium">{otherName}</span>
            {" · for "}
            <span className="line-clamp-1 inline">{offeredTitle}</span>
          </p>
        </div>
        <StatusPill status={swap.status} />
      </Link>
    </li>
  );
}
