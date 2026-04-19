import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookCover } from "@/components/book-cover";

export default async function DiscoverBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

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
        className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
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
          <h1 className="text-xl font-semibold">{book.title}</h1>
          {book.author && (
            <p className="text-sm text-neutral-500">{book.author}</p>
          )}
        </div>
      </div>

      <dl className="mt-8 divide-y divide-neutral-200 rounded-md border border-neutral-200 text-sm dark:divide-neutral-800 dark:border-neutral-800">
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-neutral-500">Condition</dt>
          <dd className="font-medium">
            {book.condition === "good" ? "Good" : "Worn"}
          </dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-neutral-500">Owner</dt>
          <dd className="font-medium">{book.owner_first_name ?? "—"}</dd>
        </div>
      </dl>
    </main>
  );
}
