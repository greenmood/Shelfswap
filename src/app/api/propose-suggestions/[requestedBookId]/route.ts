import { NextResponse, type NextRequest } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  classifyProposeSuggestions,
  type MyBookRow,
  type OwnerWishRow,
} from "@/lib/propose-suggestions";

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ requestedBookId: string }> },
) {
  const { requestedBookId } = await context.params;

  const user = await getCurrentUser();
  if (!user) {
    return err("unauthorized", "Sign in to see suggestions.", 401);
  }

  const supabase = await createClient();

  const { data: requested, error: reqErr } = await supabase
    .from("books")
    .select("id, owner_id")
    .eq("id", requestedBookId)
    .maybeSingle();

  if (reqErr) return err("load_failed", reqErr.message, 500);
  if (!requested) return err("not_found", "Book not found.", 404);
  if (requested.owner_id === user.id) {
    return err(
      "requested_is_yours",
      "You can't propose a swap for your own book.",
      400,
    );
  }

  const admin = createAdminClient();

  const [myBooksRes, ownerWishesRes, openSwapsRes] = await Promise.all([
    supabase
      .from("books")
      .select("id, title, author, cover_url, condition, created_at")
      .eq("owner_id", user.id)
      .eq("is_available", true)
      .order("created_at", { ascending: false }),
    // Admin: book_wishes RLS only lets a user read their own wishes. We need
    // the owner's, and we never return them — they're used purely to rank
    // the requester's own books server-side.
    admin
      .from("book_wishes")
      .select("book_id, book:books(title, author)")
      .eq("user_id", requested.owner_id),
    supabase
      .from("swap_requests")
      .select("offered_book_id")
      .eq("requester_id", user.id)
      .eq("requested_book_id", requestedBookId)
      .in("status", ["pending", "accepted"]),
  ]);

  if (myBooksRes.error) {
    return err("my_books_failed", myBooksRes.error.message, 500);
  }
  if (ownerWishesRes.error) {
    return err("owner_wishes_failed", ownerWishesRes.error.message, 500);
  }
  if (openSwapsRes.error) {
    return err("open_swaps_failed", openSwapsRes.error.message, 500);
  }

  const myBooks = (myBooksRes.data ?? []) as MyBookRow[];
  const ownerWishes = (ownerWishesRes.data ?? []) as unknown as OwnerWishRow[];
  const lockedIds = new Set(
    (openSwapsRes.data ?? []).map((s) => s.offered_book_id),
  );

  const buckets = classifyProposeSuggestions(myBooks, ownerWishes, lockedIds);
  return NextResponse.json(buckets);
}
