import { NextResponse, type NextRequest } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

type CreateWishBody = {
  book_id?: string;
};

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
  if (!book_id) {
    return err("missing_book_id", "book_id is required.", 400);
  }

  const supabase = await createClient();

  // Upsert keeps POST idempotent — re-hearting the same book is a no-op,
  // not a 409. RLS guarantees user_id can only be the caller.
  const { error } = await supabase
    .from("book_wishes")
    .upsert(
      { user_id: user.id, book_id },
      { onConflict: "user_id,book_id", ignoreDuplicates: true },
    );

  if (error) {
    // FK violation on book_id → treat as 404 rather than a generic 500.
    if (error.code === "23503") {
      return err("book_not_found", "That book doesn't exist.", 404);
    }
    return err("insert_failed", error.message, 500);
  }

  return NextResponse.json({ book_id, wished: true }, { status: 201 });
}
