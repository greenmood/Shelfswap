import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BookCover } from "@/components/book-cover";
import { StatusPill, type SwapStatus } from "@/components/status-pill";
import { whatsappUrl, telegramUrl, instagramUrl } from "@/lib/handles";
import { SwapActions } from "./swap-actions";

type BookRef = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
};

type ProfileRef = {
  first_name: string | null;
  whatsapp: string | null;
  telegram: string | null;
  instagram: string | null;
};

type SwapDetail = {
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

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default async function SwapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Admin client to bypass RLS on the embedded tables (books RLS hides
  // unavailable books, users RLS hides other users). We verify the caller
  // is a party to the swap below.
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("swap_requests")
    .select(
      "id, status, created_at, requester_id, owner_id, " +
        "requested:requested_book_id ( id, title, author, cover_url ), " +
        "offered:offered_book_id ( id, title, author, cover_url ), " +
        "requester_profile:requester_id ( first_name, whatsapp, telegram, instagram ), " +
        "owner_profile:owner_id ( first_name, whatsapp, telegram, instagram )",
    )
    .eq("id", id)
    .single();

  const swap = data as unknown as SwapDetail | null;

  if (!swap) {
    notFound();
  }

  const isOwner = swap.owner_id === user.id;
  const isRequester = swap.requester_id === user.id;

  // RLS should already block non-parties, but double-check so a weird row
  // shape can't leak through.
  if (!isOwner && !isRequester) {
    notFound();
  }

  const otherPartyId = isOwner ? swap.requester_id : swap.owner_id;
  const otherPartyProfile = isOwner
    ? swap.requester_profile
    : swap.owner_profile;
  const otherPartyName = otherPartyProfile?.first_name ?? "someone";

  const canRevealHandles =
    swap.status === "accepted" || swap.status === "completed";
  const handles = canRevealHandles && otherPartyProfile
    ? buildHandles(otherPartyProfile)
    : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      <Link
        href="/app/swaps"
        className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        ← My Swaps
      </Link>

      <div className="mt-6 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">Swap</h1>
        <StatusPill status={swap.status} />
      </div>

      <p className="mt-2 text-sm text-neutral-500">
        {isOwner
          ? `${otherPartyName} wants one of your books.`
          : `You want ${otherPartyName}’s book.`}
      </p>

      <section className="mt-8 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {isOwner ? "They want" : "You want"}
        </p>
        <BookRow book={swap.requested} />
      </section>

      <div
        aria-hidden
        className="my-3 text-center text-sm text-neutral-400"
      >
        ↓ in exchange for
      </div>

      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {isOwner ? "Their offer" : "Your offer"}
        </p>
        <BookRow book={swap.offered} />
      </section>

      <section className="mt-8 divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
        <Link
          href={`/app/users/${otherPartyId}`}
          className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
        >
          <span className="text-neutral-500">
            {isOwner ? "Requested by" : "Owner"}
          </span>
          <span className="flex items-center gap-1 font-medium">
            <span className="underline underline-offset-4">
              {otherPartyName}
            </span>
            <span aria-hidden className="text-neutral-400">
              ›
            </span>
          </span>
        </Link>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-neutral-500">Proposed</span>
          <time
            dateTime={swap.created_at}
            className="font-medium"
          >
            {relativeTime(swap.created_at)}
          </time>
        </div>
      </section>

      {canRevealHandles && (
        <section className="mt-8 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Contact {otherPartyName}
          </p>
          {handles.length > 0 ? (
            <div className="divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
              {handles.map((h) => (
                <a
                  key={h.label}
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                >
                  <span className="text-neutral-500">{h.label}</span>
                  <span className="flex items-center gap-1 font-medium">
                    <span className="underline underline-offset-4">
                      {h.display}
                    </span>
                    <span aria-hidden className="text-neutral-400">
                      ›
                    </span>
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              {otherPartyName} hasn&rsquo;t shared any contact handles.
            </p>
          )}
          <p className="text-xs text-neutral-500">
            Tap a handle to open the app and coordinate the swap.
          </p>
        </section>
      )}

      <SwapActions
        swapId={swap.id}
        status={swap.status}
        role={isOwner ? "owner" : "requester"}
      />
    </main>
  );
}

type Handle = { label: string; display: string; url: string };

function buildHandles(profile: ProfileRef): Handle[] {
  const out: Handle[] = [];
  const tg = telegramUrl(profile.telegram);
  if (tg && profile.telegram) {
    out.push({ label: "Telegram", display: `@${profile.telegram.replace(/^@/, "")}`, url: tg });
  }
  const ig = instagramUrl(profile.instagram);
  if (ig && profile.instagram) {
    out.push({ label: "Instagram", display: `@${profile.instagram.replace(/^@/, "")}`, url: ig });
  }
  const wa = whatsappUrl(profile.whatsapp);
  if (wa && profile.whatsapp) {
    out.push({ label: "WhatsApp", display: profile.whatsapp, url: wa });
  }
  return out;
}

function BookRow({ book }: { book: BookRef | null }) {
  const title = book?.title ?? "Unknown book";
  return (
    <div className="flex items-start gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800">
      <BookCover cover_url={book?.cover_url ?? null} alt={title} size="md" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="line-clamp-2 text-sm font-medium">{title}</p>
        {book?.author && (
          <p className="line-clamp-1 text-xs text-neutral-500">
            {book.author}
          </p>
        )}
      </div>
    </div>
  );
}
