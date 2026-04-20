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

  // Fetch the requested book + my available books + my open swaps for this
  // same requested book, all in parallel.
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      <Link
        href={`/app/discover/books/${id}`}
        className="text-sm text-muted hover:text-ink dark:hover:text-neutral-100"
      >
        ← Book
      </Link>

      <h1 className="mt-6 font-serif text-2xl font-medium tracking-tight">Propose a swap</h1>

      <section className="mt-8 space-y-3">
        <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
          You want
        </p>
        <div className="flex items-start gap-4 rounded-md border border-subtle p-4 dark:border-neutral-800">
          <BookCover
            cover_url={requested.cover_url}
            alt={requested.title}
            size="md"
          />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium">{requested.title}</p>
            {requested.author && (
              <p className="text-sm text-muted">{requested.author}</p>
            )}
            <p className="text-xs text-muted">
              From {requested.owner_first_name ?? "someone"}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8 space-y-3">
        <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
          Offer in return
        </p>

        {myBooks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-subtle p-6 text-center dark:border-neutral-700">
            <p className="text-sm">You don&rsquo;t have any available books.</p>
            <Link
              href="/app/add"
              className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper dark:bg-paper dark:text-ink"
            >
              <span aria-hidden>＋</span> Add a book
            </Link>
          </div>
        ) : (
          <ProposeForm requestedBookId={requested.id} myBooks={myBooks} />
        )}
      </section>
    </main>
  );
}
