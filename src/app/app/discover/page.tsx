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
  const { data: initial } = await supabase
    .from("discoverable_books")
    .select(
      "id, title, author, cover_url, condition, owner_id, owner_first_name, created_at",
    )
    .not("owner_id", "eq", user.id)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app"
          className="text-sm text-muted hover:text-ink dark:hover:text-neutral-100"
        >
          ← Library
        </Link>
      </div>

      <h1 className="mt-6 text-2xl font-semibold">Discover</h1>
      <p className="mt-1 text-sm text-muted">
        Books other people have put up for swap.
      </p>

      <DiscoverFeed initial={initial ?? []} currentUserId={user.id} />
    </main>
  );
}
