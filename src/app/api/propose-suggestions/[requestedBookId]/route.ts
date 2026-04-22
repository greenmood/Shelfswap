import { NextResponse, type NextRequest } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Condition = "good" | "worn";

type SuggestionBook = {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  condition: Condition;
  locked: boolean;
  // Populated for `likely` entries. Either or both may be set; null on
  // `wanted` / `other`.
  match_title: string | null;
  match_author: string | null;
};

type Bucket = "wanted" | "likely" | "other";

type OwnerWishRow = {
  book_id: string;
  book: { title: string | null; author: string | null } | null;
};

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}

function normalize(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
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
  const ownerId = requested.owner_id;

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
      .eq("user_id", ownerId),
    // Same "locked" check the existing Propose page does: a book I've
    // already offered for this same requested book in an open swap.
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

  const myBooks = myBooksRes.data ?? [];
  const ownerWishes = (ownerWishesRes.data ?? []) as unknown as OwnerWishRow[];
  const lockedIds = new Set(
    (openSwapsRes.data ?? []).map((s) => s.offered_book_id),
  );

  const wishedBookIds = new Set<string>();
  const wishedTitles = new Map<string, string>(); // normalized → original
  const wishedAuthors = new Map<string, string>();
  for (const w of ownerWishes) {
    wishedBookIds.add(w.book_id);
    const t = normalize(w.book?.title);
    if (t && w.book?.title) wishedTitles.set(t, w.book.title);
    const a = normalize(w.book?.author);
    if (a && w.book?.author) wishedAuthors.set(a, w.book.author);
  }

  const buckets: Record<Bucket, SuggestionBook[]> = {
    wanted: [],
    likely: [],
    other: [],
  };

  for (const b of myBooks) {
    const locked = lockedIds.has(b.id);

    if (wishedBookIds.has(b.id)) {
      buckets.wanted.push({
        id: b.id,
        title: b.title,
        author: b.author,
        cover_url: b.cover_url,
        condition: b.condition as Condition,
        locked,
        match_title: null,
        match_author: null,
      });
      continue;
    }

    const titleHit = wishedTitles.get(normalize(b.title)) ?? null;
    const authorHit = b.author
      ? (wishedAuthors.get(normalize(b.author)) ?? null)
      : null;

    if (titleHit || authorHit) {
      buckets.likely.push({
        id: b.id,
        title: b.title,
        author: b.author,
        cover_url: b.cover_url,
        condition: b.condition as Condition,
        locked,
        match_title: titleHit,
        match_author: authorHit,
      });
    } else {
      buckets.other.push({
        id: b.id,
        title: b.title,
        author: b.author,
        cover_url: b.cover_url,
        condition: b.condition as Condition,
        locked,
        match_title: null,
        match_author: null,
      });
    }
  }

  return NextResponse.json(buckets);
}
