import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { DiscoverFeed, PAGE_SIZE } from "./discover-feed";

export default async function DiscoverPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const supabase = await createClient();

  // PostgREST quirk: .neq on a UUID column projected through a view returns
  // empty; .not(col,"eq",val) is the working equivalent. Separately, .range()
  // combined with .not on this view drops rows — cursor pagination via
  // .limit() + .lt(cursor) avoids both issues.
  const [initialRes, wishesRes] = await Promise.all([
    supabase
      .from("discoverable_books")
      .select(
        "id, title, author, cover_url, condition, owner_id, owner_first_name, created_at",
      )
      .not("owner_id", "eq", user.id)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    // RLS on book_wishes scopes SELECT to the caller's own rows, so this
    // returns only the current user's wishes.
    supabase.from("book_wishes").select("book_id"),
  ]);

  const wishedBookIds = (wishesRes.data ?? []).map((w) => w.book_id);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6 pb-24 md:max-w-lg md:pb-6">
      <Link
        href="/app"
        className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted hover:text-ink"
      >
        ← Library
      </Link>

      <h1 className="mt-4 font-serif text-2xl font-medium tracking-tight">
        Discover
      </h1>

      <DiscoverFeed
        initial={initialRes.data ?? []}
        currentUserId={user.id}
        initialWishedBookIds={wishedBookIds}
      />
    </main>
  );
}
