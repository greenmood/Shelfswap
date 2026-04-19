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
  requested: BookRef;
  offered: BookRef;
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
        className="grid grid-cols-2 rounded-md border border-neutral-200 p-1 text-sm dark:border-neutral-800"
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
          ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
          : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      }`}
    >
      {label}{" "}
      <span className="text-xs opacity-75">({count})</span>
    </button>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-neutral-300 p-8 text-center dark:border-neutral-700">
      <p className="text-sm text-neutral-500">
        {tab === "incoming"
          ? "No one's asked for your books yet."
          : "You haven't proposed any swaps."}
      </p>
      {tab === "outgoing" && (
        <Link
          href="/app/discover"
          className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          Browse Discover
        </Link>
      )}
    </div>
  );
}

function SwapItem({ swap, tab }: { swap: SwapRow; tab: Tab }) {
  // For incoming: focus is on what someone wants from you (= requested book).
  // For outgoing: focus is on what you want (= requested book) too.
  // Either way, the "headline" book is `requested`. The "side" hint is the
  // other party's first name + a label of who they are relative to you.
  const otherName =
    tab === "incoming"
      ? (swap.requester_profile?.first_name ?? "someone")
      : (swap.owner_profile?.first_name ?? "someone");

  return (
    <li>
      <Link
        href={`/app/swaps/${swap.id}`}
        className="flex items-start gap-3 rounded-md border border-neutral-200 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
      >
        <BookCover
          cover_url={swap.requested.cover_url}
          alt={swap.requested.title}
          size="md"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-2 text-sm font-medium">
            {swap.requested.title}
          </p>
          {swap.requested.author && (
            <p className="line-clamp-1 text-xs text-neutral-500">
              {swap.requested.author}
            </p>
          )}
          <p className="text-xs text-neutral-500">
            {tab === "incoming" ? "From " : "To "}
            <span className="font-medium">{otherName}</span>
            {" · for "}
            <span className="line-clamp-1 inline">
              {swap.offered.title}
            </span>
          </p>
        </div>
        <StatusPill status={swap.status} />
      </Link>
    </li>
  );
}
