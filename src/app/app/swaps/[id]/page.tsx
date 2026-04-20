import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Admin client bypasses RLS on embedded tables (books / users). We verify
  // caller is a party below.
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
  if (!swap) notFound();

  const isOwner = swap.owner_id === user.id;
  const isRequester = swap.requester_id === user.id;
  if (!isOwner && !isRequester) notFound();

  const otherProfile = isOwner
    ? swap.requester_profile
    : swap.owner_profile;
  const otherName = otherProfile?.first_name ?? "someone";

  // From viewer's perspective:
  //   Owner: their own requested_book is what they give; offered_book is what they get.
  //   Requester: their offered_book is what they give; requested_book is what they get.
  const giveBook = isOwner ? swap.requested : swap.offered;
  const getBook = isOwner ? swap.offered : swap.requested;

  const canRevealHandles =
    swap.status === "accepted" || swap.status === "completed";
  const handles =
    canRevealHandles && otherProfile ? buildHandles(otherProfile) : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6 md:max-w-lg">
      <div className="flex items-center justify-between">
        <Link
          href="/app/swaps"
          className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted hover:text-ink"
        >
          ← Swaps
        </Link>
        <StatusPill status={swap.status} />
      </div>

      <h1 className="sr-only">Swap with {otherName}</h1>

      {/* Status banner — accepted + completed only; other statuses rely on
          the pill at the top. */}
      {swap.status === "accepted" && (
        <Banner
          title="It's a match"
          sub="Coordinate the handoff and mark complete when done."
          tone="accepted"
        />
      )}
      {swap.status === "completed" && (
        <Banner
          title="Swap complete"
          sub="Both books are off the shelf."
          tone="completed"
        />
      )}

      {/* Swap pair — YOU GIVE | ⇄ | YOU GET */}
      <section className="mt-6 flex items-center gap-3 rounded-md bg-cream-dim p-4">
        <SwapHalf label="You give" book={giveBook} />
        <span aria-hidden className="shrink-0 font-mono text-sm text-muted">
          ⇄
        </span>
        <SwapHalf label="You get" book={getBook} />
      </section>

      {/* Contact block — accepted + completed only */}
      {canRevealHandles && (
        <section className="mt-6 rounded-md bg-accent-soft p-4">
          <p className="font-mono text-[9px] font-medium uppercase tracking-widest text-accent">
            Contact {otherName}
          </p>
          <p className="mt-1 font-serif text-lg font-medium tracking-tight">
            {otherName}
          </p>

          {handles.length > 0 ? (
            <div className="mt-3 flex flex-col gap-1.5">
              {handles.map((h) => (
                <a
                  key={h.label}
                  href={h.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-3 rounded bg-paper px-3 py-2 text-sm transition hover:opacity-90"
                >
                  <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
                    {h.label}
                  </span>
                  <span className="flex items-center gap-1 font-mono text-xs text-ink">
                    {h.display}
                    <span aria-hidden className="text-muted">
                      ›
                    </span>
                  </span>
                </a>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted">
              {otherName} hasn&rsquo;t shared any contact handles.
            </p>
          )}

          <p className="mt-3 font-mono text-[10px] tracking-widest text-muted">
            Tap to open the app
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

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Banner({
  title,
  sub,
  tone,
}: {
  title: string;
  sub: string;
  tone: "accepted" | "completed";
}) {
  const palette =
    tone === "accepted"
      ? { bg: "bg-accepted-bg", fg: "text-accepted-fg" }
      : { bg: "bg-accent-soft", fg: "text-accent" };
  return (
    <div className={`mt-4 rounded-md p-4 ${palette.bg}`}>
      <p className={`font-serif text-base font-medium ${palette.fg}`}>
        {title}
      </p>
      <p
        className={`mt-0.5 font-mono text-[10px] tracking-widest ${palette.fg} opacity-80`}
      >
        {sub}
      </p>
    </div>
  );
}

function SwapHalf({
  label,
  book,
}: {
  label: string;
  book: BookRef | null;
}) {
  const title = book?.title ?? "Unknown book";
  return (
    <div className="min-w-0 flex-1">
      <p className="font-mono text-[9px] font-medium uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className="mt-1 truncate font-serif text-sm font-medium leading-tight">
        {title}
      </p>
      {book?.author && (
        <p className="truncate text-[10.5px] text-muted">{book.author}</p>
      )}
    </div>
  );
}

type Handle = { label: string; display: string; url: string };

function buildHandles(profile: ProfileRef): Handle[] {
  const out: Handle[] = [];
  const tg = telegramUrl(profile.telegram);
  if (tg && profile.telegram) {
    out.push({
      label: "Telegram",
      display: `@${profile.telegram.replace(/^@/, "")}`,
      url: tg,
    });
  }
  const ig = instagramUrl(profile.instagram);
  if (ig && profile.instagram) {
    out.push({
      label: "Instagram",
      display: `@${profile.instagram.replace(/^@/, "")}`,
      url: ig,
    });
  }
  const wa = whatsappUrl(profile.whatsapp);
  if (wa && profile.whatsapp) {
    out.push({
      label: "WhatsApp",
      display: profile.whatsapp,
      url: wa,
    });
  }
  return out;
}
