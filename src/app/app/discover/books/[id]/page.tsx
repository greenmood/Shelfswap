import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { BookCover } from "@/components/book-cover";

export default async function DiscoverBookPage({
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

  const { data: book } = await supabase
    .from("discoverable_books")
    .select(
      "id, title, author, cover_url, condition, owner_id, owner_first_name",
    )
    .eq("id", id)
    .single();

  if (!book) {
    notFound();
  }

  // Safety: someone arriving here with their own book's id should bounce to
  // the edit page (the normal nav path is from Discover which filters this
  // out, but a direct URL paste shouldn't dump them into an awkward view).
  if (book.owner_id === user.id) {
    redirect(`/app/books/${book.id}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      <Link
        href="/app/discover"
        className="text-sm text-muted hover:text-ink dark:hover:text-neutral-100"
      >
        ← Discover
      </Link>

      <div className="mt-8 flex flex-col items-center gap-4">
        <BookCover
          cover_url={book.cover_url}
          alt={book.title}
          size="lg"
        />
        <div className="space-y-1 text-center">
          <h1 className="font-serif text-xl font-medium tracking-tight">{book.title}</h1>
          {book.author && (
            <p className="text-sm text-muted">{book.author}</p>
          )}
        </div>
      </div>

      <div className="mt-8">
        <Link
          href={`/app/discover/books/${book.id}/propose`}
          className="inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper dark:bg-paper dark:text-ink"
        >
          Propose swap
        </Link>
      </div>

      <div className="mt-6 divide-y divide-subtle rounded-md border border-subtle text-sm dark:divide-neutral-800 dark:border-neutral-800">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-muted">Condition</span>
          <span className="font-medium">
            {book.condition === "good" ? "Good" : "Worn"}
          </span>
        </div>
        <Link
          href={`/app/users/${book.owner_id}`}
          className="flex items-center justify-between px-4 py-3 hover:bg-cream-dim dark:hover:bg-ink"
        >
          <span className="text-muted">Owner</span>
          <span className="flex items-center gap-1 font-medium">
            <span className="underline underline-offset-4">
              {book.owner_first_name ?? "—"}
            </span>
            <span aria-hidden className="text-muted">
              ›
            </span>
          </span>
        </Link>
      </div>
    </main>
  );
}
