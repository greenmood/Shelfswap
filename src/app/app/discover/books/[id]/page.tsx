import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { BookCover } from "@/components/book-cover";
import { HeartButton } from "@/components/heart-button";

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

  const [bookRes, wishRes] = await Promise.all([
    supabase
      .from("discoverable_books")
      .select(
        "id, title, author, cover_url, condition, owner_id, owner_first_name, wish_count",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("book_wishes")
      .select("book_id")
      .eq("book_id", id)
      .maybeSingle(),
  ]);

  const book = bookRes.data;
  if (!book) {
    notFound();
  }

  // If someone arrives here with their own book's id, bounce them to edit.
  if (book.owner_id === user.id) {
    redirect(`/app/books/${book.id}`);
  }

  const ownerName = book.owner_first_name ?? "someone";
  const conditionLabel =
    book.condition === "good" ? "Good condition" : "Worn condition";
  const wished = wishRes.data !== null;
  const wishCount = book.wish_count ?? 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6 md:max-w-lg">
      <div className="flex items-center justify-between">
        <Link
          href="/app/discover"
          className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted hover:text-ink"
        >
          ← Discover
        </Link>
        <HeartButton bookId={book.id} initialWished={wished} />
      </div>

      {/* Hero: big centered cover + title + author + condition pill */}
      <section className="mt-8 flex flex-col items-center text-center">
        <BookCover cover_url={book.cover_url} alt={book.title} size="lg" />
        <h1 className="mt-5 font-serif text-[22px] font-medium leading-tight tracking-tight">
          {book.title}
        </h1>
        {book.author && (
          <p className="mt-1 font-serif text-sm italic text-muted">
            {book.author}
          </p>
        )}
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-widest text-accent">
            {conditionLabel}
          </span>
        </div>
        {wishCount > 0 && (
          <p className="mt-3 font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
            <span className="text-accent">♥</span>{" "}
            {wishCount === 1
              ? "1 person wants this"
              : `${wishCount} people want this`}
          </p>
        )}
      </section>

      {/* Owner card — clickable; taps through to the public profile */}
      <Link
        href={`/app/users/${book.owner_id}`}
        className="mt-8 flex items-center gap-3 rounded-md bg-cream-dim px-3 py-3 hover:bg-cream-dim/80"
      >
        <Avatar />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Offered by {ownerName}</p>
          <p className="mt-0.5 font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
            View profile
          </p>
        </div>
        <span aria-hidden className="text-base text-muted">
          ›
        </span>
      </Link>

      {/* Primary CTA pinned to bottom of the flex column */}
      <div className="mt-auto pt-10">
        <Link
          href={`/app/discover/books/${book.id}/propose`}
          className="block w-full rounded-md bg-ink px-4 py-3 text-center text-sm font-medium text-paper"
        >
          Propose a swap
        </Link>
      </div>
    </main>
  );
}

function Avatar() {
  // Decorative gradient circle — no user avatars in v0. Keeps the owner card
  // visually grounded without requiring image uploads.
  return (
    <div
      aria-hidden
      className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-br from-[#d6c8a6] to-[#b39d6f]"
    />
  );
}
