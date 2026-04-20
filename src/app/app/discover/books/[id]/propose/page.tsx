import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { BookCover } from "@/components/book-cover";
import { ProposeForm } from "./propose-form";

export default async function ProposePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const supabase = await createClient();

  const [requestedResult, myBooksResult, openSwapsResult] = await Promise.all([
    supabase
      .from("discoverable_books")
      .select("id, title, author, cover_url, owner_id, owner_first_name")
      .eq("id", id)
      .single(),
    supabase
      .from("books")
      .select("id, title, author, cover_url")
      .eq("owner_id", user.id)
      .eq("is_available", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("swap_requests")
      .select("offered_book_id")
      .eq("requester_id", user.id)
      .eq("requested_book_id", id)
      .in("status", ["pending", "accepted"]),
  ]);

  const requested = requestedResult.data;
  const lockedIds = new Set(
    (openSwapsResult.data ?? []).map((s) => s.offered_book_id),
  );
  const myBooks = (myBooksResult.data ?? []).map((b) => ({
    ...b,
    locked: lockedIds.has(b.id),
  }));

  if (!requested) {
    notFound();
  }

  if (requested.owner_id === user.id) {
    redirect(`/app/books/${requested.id}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6 md:max-w-lg">
      <Link
        href={`/app/discover/books/${id}`}
        className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted hover:text-ink"
      >
        ← Book
      </Link>

      <h1 className="mt-4 font-serif text-2xl font-medium tracking-tight">
        Propose a swap
      </h1>

      {/* Target card — the book you want. Accent-soft bg signals which
          direction of the swap this row represents. */}
      <section className="mt-6 flex items-start gap-3 rounded-md bg-accent-soft p-3">
        <BookCover
          cover_url={requested.cover_url}
          alt={requested.title}
          size="sm"
        />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-mono text-[9px] font-medium uppercase tracking-widest text-accent">
            You want
          </p>
          <p className="line-clamp-2 font-serif text-sm font-medium leading-tight">
            {requested.title}
          </p>
          {requested.author && (
            <p className="line-clamp-1 text-xs text-muted">
              {requested.author}
            </p>
          )}
          <p className="pt-0.5 font-mono text-[10px] text-muted">
            from {requested.owner_first_name ?? "someone"}
          </p>
        </div>
      </section>

      <p className="mt-6 font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
        Offer in return (pick one)
      </p>

      {myBooks.length === 0 ? (
        <div className="mt-3 flex flex-col items-center gap-3 rounded-md border border-dashed border-subtle bg-cream-dim/40 p-6 text-center">
          <p className="text-sm">
            You don&rsquo;t have any available books to offer.
          </p>
          <Link
            href="/app/add"
            className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper"
          >
            <span aria-hidden>＋</span> Add a book
          </Link>
        </div>
      ) : (
        <ProposeForm requestedBookId={requested.id} myBooks={myBooks} />
      )}
    </main>
  );
}
