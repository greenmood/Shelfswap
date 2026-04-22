import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { BookCover } from "@/components/book-cover";
import { HeartButton } from "@/components/heart-button";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // If viewing yourself, bounce to the editable profile.
  if (id === user.id) {
    redirect("/app/profile");
  }

  const supabase = await createClient();
  const [profileRes, booksRes, wishesRes] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("id, first_name, has_whatsapp, has_telegram, has_instagram")
      .eq("id", id)
      .single(),
    supabase
      .from("discoverable_books")
      .select("id, title, author, cover_url, condition")
      .eq("owner_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("book_wishes").select("book_id"),
  ]);

  const profile = profileRes.data;
  if (!profile) {
    notFound();
  }

  const books = booksRes.data ?? [];
  const wishedIds = new Set((wishesRes.data ?? []).map((w) => w.book_id));

  // Order: Telegram, Instagram, WhatsApp. Safer defaults first per build_order.
  const channels = [
    profile.has_telegram && "Telegram",
    profile.has_instagram && "Instagram",
    profile.has_whatsapp && "WhatsApp",
  ].filter(Boolean) as string[];

  const firstName = profile.first_name ?? "—";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col md:max-w-lg p-6">
      <Link
        href="/app/discover"
        className="text-sm text-muted hover:text-ink dark:hover:text-neutral-100"
      >
        ← Discover
      </Link>

      <div className="mt-8 space-y-1">
        <h1 className="font-serif text-2xl font-medium tracking-tight">
          {firstName}
        </h1>
      </div>

      <section className="mt-8 space-y-3 rounded-md border border-subtle bg-paper p-4 dark:border-neutral-800">
        <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
          Reachable via
        </p>
        {channels.length > 0 ? (
          <p className="text-sm">{channels.join(" · ")}</p>
        ) : (
          <p className="text-sm text-muted">No contact channels set up.</p>
        )}
        <p className="text-xs text-muted">
          Full handles are revealed once a swap is accepted.
        </p>
      </section>

      <section className="mt-8">
        <p className="mb-3 font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
          On {firstName}&rsquo;s shelf
        </p>
        {books.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing available right now.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-md bg-paper">
            {books.map((book) => (
              <li
                key={book.id}
                className="flex items-start gap-3 border-b border-divider px-4 py-3 last:border-b-0 hover:bg-cream-dim/40"
              >
                <Link
                  href={`/app/discover/books/${book.id}`}
                  className="flex min-w-0 flex-1 items-start gap-3"
                >
                  <BookCover
                    cover_url={book.cover_url}
                    alt={book.title}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="line-clamp-2 font-serif text-sm font-medium leading-tight">
                      {book.title}
                    </p>
                    {book.author && (
                      <p className="line-clamp-1 text-xs text-muted">
                        {book.author}
                      </p>
                    )}
                    <p className="pt-0.5 font-mono text-[10px] text-muted">
                      {book.condition === "good" ? "Good" : "Worn"}
                    </p>
                  </div>
                </Link>
                <HeartButton
                  bookId={book.id}
                  initialWished={wishedIds.has(book.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
