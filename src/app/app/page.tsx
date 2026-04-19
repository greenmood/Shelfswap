import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BookCover } from "@/components/book-cover";
import { SignOutButton } from "./sign-out-button";

export default async function AppHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: books }] = await Promise.all([
    supabase.from("users").select("first_name").eq("id", user.id).single(),
    supabase
      .from("books")
      .select("id, title, author, cover_url, is_available, created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Library</h1>
        <Link
          href="/app/profile"
          aria-label="Profile"
          className="text-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          ⚙︎
        </Link>
      </header>

      <div className="mt-6 space-y-3">
        {profile?.first_name ? (
          <p className="text-sm text-neutral-500">
            Hi, {profile.first_name}.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">
              Set up your profile to get started.
            </p>
            <Link
              href="/app/profile"
              className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              Complete profile
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6">
        <Link
          href="/app/add"
          className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          <span aria-hidden>＋</span> Add book
        </Link>
      </div>

      <ul className="mt-6 space-y-2">
        {books?.map((book) => (
          <li
            key={book.id}
            className="flex items-start gap-3 rounded-md border border-neutral-200 p-3 dark:border-neutral-800"
          >
            <BookCover
              cover_url={book.cover_url}
              alt={book.title}
              size="md"
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="line-clamp-2 text-sm font-medium">{book.title}</p>
              {book.author && (
                <p className="line-clamp-1 text-xs text-neutral-500">
                  {book.author}
                </p>
              )}
            </div>
            <AvailabilityPill isAvailable={book.is_available} />
          </li>
        ))}
      </ul>

      {books && books.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">No books yet.</p>
      )}

      <div className="mt-auto pt-8">
        <SignOutButton />
      </div>
    </main>
  );
}

function AvailabilityPill({ isAvailable }: { isAvailable: boolean }) {
  return (
    <span
      className={
        isAvailable
          ? "shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : "shrink-0 rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
      }
    >
      {isAvailable ? "Available" : "Unavailable"}
    </span>
  );
}
