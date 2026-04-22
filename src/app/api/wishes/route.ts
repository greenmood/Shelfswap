import { NextResponse, type NextRequest } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

type CreateWishBody = {
  book_id?: unknown;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return err("unauthorized", "Sign in to heart a book.", 401);
  }

  let body: CreateWishBody;
  try {
    body = await request.json();
  } catch {
    return err("invalid_json", "Body must be valid JSON.", 400);
  }

  const { book_id } = body;
  if (typeof book_id !== "string" || !UUID_RE.test(book_id)) {
    return err("invalid_book_id", "book_id must be a valid UUID.", 400);
  }

  const supabase = await createClient();

  // Block self-hearts defensively: the UI never surfaces a heart on own
  // books, but the DB constraint doesn't forbid it. Without this, the
  // Library match banner could compute "you match yourself".
  const { data: book, error: bookErr } = await supabase
    .from("books")
    .select("owner_id")
    .eq("id", book_id)
    .maybeSingle();

  if (bookErr) return err("load_failed", bookErr.message, 500);
  if (!book) {
    return err(
      "book_not_found",
      "That book doesn't exist or isn't available.",
      404,
    );
  }
  if (book.owner_id === user.id) {
    return err("own_book", "You can't heart your own book.", 400);
  }

  // Upsert keeps POST idempotent — re-hearting the same book is a no-op,
  // not a 409. RLS guarantees user_id can only be the caller.
  const { error } = await supabase
    .from("book_wishes")
    .upsert(
      { user_id: user.id, book_id },
      { onConflict: "user_id,book_id", ignoreDuplicates: true },
    );

  if (error) {
    return err("insert_failed", error.message, 500);
  }

  return NextResponse.json({ book_id, wished: true }, { status: 201 });
}
