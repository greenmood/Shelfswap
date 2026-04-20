import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SwapsTabs, type SwapRow } from "./swaps-tabs";

export default async function SwapsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Admin client bypasses RLS. Safe here because:
  //   1. getCurrentUser() has already verified the caller's identity.
  //   2. Both queries are explicitly filtered to the caller's id.
  // Without admin, the book embed can return null when the other party's
  // book is no longer available (RLS hides it), which makes the UI crash.
  const supabase = createAdminClient();

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app"
          className="text-sm text-muted hover:text-ink dark:hover:text-neutral-100"
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
