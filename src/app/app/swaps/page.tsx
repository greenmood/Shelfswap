import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { SwapsTabs, type SwapRow } from "./swaps-tabs";

export default async function SwapsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const supabase = await createClient();

  // PostgREST embed pulls related rows in one round-trip. Aliases (incoming /
  // outgoing intent) are surfaced via the response shape: requested_book is
  // what's being asked for; offered_book is what's being given in exchange.
  // Owner / requester name come via FK to users -> aliased through public_profiles.
  const select =
    "id, status, created_at, requester_id, owner_id, " +
    "requested:requested_book_id ( id, title, author, cover_url ), " +
    "offered:offered_book_id ( id, title, author, cover_url ), " +
    "requester_profile:requester_id ( first_name ), " +
    "owner_profile:owner_id ( first_name )";

  const [{ data: incoming }, { data: outgoing }] = await Promise.all([
    supabase
      .from("swap_requests")
      .select(select)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("swap_requests")
      .select(select)
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          ← Library
        </Link>
      </div>

      <h1 className="mt-6 text-2xl font-semibold">My Swaps</h1>

      <SwapsTabs
        incoming={(incoming ?? []) as unknown as SwapRow[]}
        outgoing={(outgoing ?? []) as unknown as SwapRow[]}
      />
    </main>
  );
}
