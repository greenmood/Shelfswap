import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSwapRequestEmail } from "@/lib/email/send";

type CreateSwapBody = {
  requested_book_id?: string;
  offered_book_id?: string;
};

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function POST(request: NextRequest) {
  // --- Validation 1: authed caller --------------------------------------
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return err("unauthorized", "Sign in to propose a swap.", 401);
  }

  let body: CreateSwapBody;
  try {
    body = await request.json();
  } catch {
    return err("invalid_json", "Body must be valid JSON.", 400);
  }

  const { requested_book_id, offered_book_id } = body;
  if (!requested_book_id || !offered_book_id) {
    return err(
      "missing_fields",
      "Both requested_book_id and offered_book_id are required.",
      400,
    );
  }

  if (requested_book_id === offered_book_id) {
    return err(
      "same_book",
      "Requested and offered books must be different.",
      400,
    );
  }

  // Load both books in one round-trip.
  const { data: books, error: booksErr } = await supabase
    .from("books")
    .select("id, owner_id, is_available")
    .in("id", [requested_book_id, offered_book_id]);

  if (booksErr) {
    return err("books_lookup_failed", booksErr.message, 500);
  }

  const requested = books?.find((b) => b.id === requested_book_id);
  const offered = books?.find((b) => b.id === offered_book_id);

  if (!requested || !offered) {
    return err(
      "book_not_found",
      "One or both books couldn't be found.",
      404,
    );
  }

  // --- Validation 2: offered book belongs to requester -------------------
  if (offered.owner_id !== user.id) {
    return err(
      "offered_not_yours",
      "You can only offer books from your own library.",
      400,
    );
  }

  // --- Validation 3: requested book does NOT belong to requester ---------
  if (requested.owner_id === user.id) {
    return err(
      "requested_is_yours",
      "You can't request your own book.",
      400,
    );
  }

  // --- Validation 4: both books are available ---------------------------
  if (!requested.is_available || !offered.is_available) {
    return err(
      "not_available",
      "One or both books are no longer available.",
      400,
    );
  }

  // --- Validation 5: no existing pending/accepted swap for this triple ---
  const { data: existing, error: existingErr } = await supabase
    .from("swap_requests")
    .select("id, status")
    .eq("requester_id", user.id)
    .eq("requested_book_id", requested_book_id)
    .eq("offered_book_id", offered_book_id)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (existingErr) {
    return err("dupe_check_failed", existingErr.message, 500);
  }
  if (existing) {
    return err(
      "duplicate_pending",
      "You already have an open swap for this pair.",
      409,
    );
  }

  // --- Insert (admin client; swap_requests has no client-facing insert policy)
  const admin = createAdminClient();
  const { data: inserted, error: insertErr } = await admin
    .from("swap_requests")
    .insert({
      requested_book_id,
      offered_book_id,
      requester_id: user.id,
      owner_id: requested.owner_id,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr) {
    return err("insert_failed", insertErr.message, 500);
  }

  // Best-effort: notify the owner and log. Both are side effects; failures
  // here don't roll back the swap insert.
  await notifyOwner({
    admin,
    swapId: inserted.id,
    ownerId: requested.owner_id,
    requesterId: user.id,
    requestedBookId: requested_book_id,
    offeredBookId: offered_book_id,
    appOrigin: new URL(request.url).origin,
  });

  return NextResponse.json({ id: inserted.id }, { status: 201 });
}

async function notifyOwner(args: {
  admin: ReturnType<typeof createAdminClient>;
  swapId: string;
  ownerId: string;
  requesterId: string;
  requestedBookId: string;
  offeredBookId: string;
  appOrigin: string;
}) {
  const {
    admin,
    swapId,
    ownerId,
    requesterId,
    requestedBookId,
    offeredBookId,
    appOrigin,
  } = args;

  let emailOk = false;
  try {
    const [ownerUser, ownerProfile, requesterProfile, titles] =
      await Promise.all([
        admin.from("users").select("email").eq("id", ownerId).single(),
        admin
          .from("public_profiles")
          .select("first_name")
          .eq("id", ownerId)
          .single(),
        admin
          .from("public_profiles")
          .select("first_name")
          .eq("id", requesterId)
          .single(),
        admin
          .from("books")
          .select("id, title")
          .in("id", [requestedBookId, offeredBookId]),
      ]);

    const ownerEmail = ownerUser.data?.email;
    const requestedTitle =
      titles.data?.find((b) => b.id === requestedBookId)?.title ?? "a book";
    const offeredTitle =
      titles.data?.find((b) => b.id === offeredBookId)?.title ?? "a book";

    if (ownerEmail) {
      await sendSwapRequestEmail({
        to: ownerEmail,
        ownerFirstName: ownerProfile.data?.first_name ?? null,
        requesterFirstName: requesterProfile.data?.first_name ?? null,
        requestedTitle,
        offeredTitle,
        appUrl: `${appOrigin}/app`,
      });
      emailOk = true;
    }
  } catch (sendErr) {
    console.error("[swaps] notify owner failed:", sendErr);
  }

  // Log regardless — a row with kind=swap_request_failed tells us the send
  // attempt happened but didn't succeed.
  await admin.from("email_log").insert({
    to_user_id: ownerId,
    kind: emailOk ? "swap_request" : "swap_request_failed",
    swap_request_id: swapId,
  });
}
