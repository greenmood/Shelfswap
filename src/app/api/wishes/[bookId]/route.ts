import { NextResponse, type NextRequest } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ bookId: string }> },
) {
  const { bookId } = await context.params;

  if (!UUID_RE.test(bookId)) {
    return err("invalid_book_id", "book_id must be a valid UUID.", 400);
  }

  const user = await getCurrentUser();
  if (!user) {
    return err("unauthorized", "Sign in to unheart a book.", 401);
  }

  const supabase = await createClient();

  // Idempotent: deleting a wish that doesn't exist is a 200 no-op. RLS
  // already scopes this to the caller's own rows.
  const { error } = await supabase
    .from("book_wishes")
    .delete()
    .eq("user_id", user.id)
    .eq("book_id", bookId);

  if (error) {
    return err("delete_failed", error.message, 500);
  }

  return NextResponse.json({ book_id: bookId, wished: false });
}
