import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Action = "accept" | "decline" | "cancel";

const ACTIONS: Action[] = ["accept", "decline", "cancel"];

// Which role is allowed to fire each action, and what status it moves to.
const TRANSITIONS: Record<
  Action,
  { actor: "owner" | "requester"; newStatus: "accepted" | "declined" | "cancelled" }
> = {
  accept: { actor: "owner", newStatus: "accepted" },
  decline: { actor: "owner", newStatus: "declined" },
  cancel: { actor: "requester", newStatus: "cancelled" },
};

function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: code, message }, { status });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  // --- Auth ------------------------------------------------------------
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return err("unauthorized", "Sign in to update a swap.", 401);
  }

  // --- Parse body ------------------------------------------------------
  let body: { action?: string };
  try {
    body = await request.json();
  } catch {
    return err("invalid_json", "Body must be valid JSON.", 400);
  }

  const action = body.action as Action | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return err(
      "invalid_action",
      `action must be one of: ${ACTIONS.join(", ")}`,
      400,
    );
  }

  // --- Load the swap (RLS scopes to me) ------------------------------
  const { data: swap, error: loadErr } = await supabase
    .from("swap_requests")
    .select("id, status, requester_id, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (loadErr) {
    return err("load_failed", loadErr.message, 500);
  }
  if (!swap) {
    return err("not_found", "Swap not found.", 404);
  }

  // --- Role guard -----------------------------------------------------
  const { actor, newStatus } = TRANSITIONS[action];
  const isOwner = swap.owner_id === user.id;
  const isRequester = swap.requester_id === user.id;

  const canFire =
    (actor === "owner" && isOwner) || (actor === "requester" && isRequester);

  if (!canFire) {
    return err(
      "forbidden",
      `Only the ${actor} can ${action} this swap.`,
      403,
    );
  }

  // --- Current-state guard -------------------------------------------
  if (swap.status !== "pending") {
    return err(
      "state_changed",
      `This swap is already ${swap.status}.`,
      409,
    );
  }

  // --- Atomic conditional update via admin client --------------------
  const admin = createAdminClient();
  const { data: updated, error: updateErr } = await admin
    .from("swap_requests")
    .update({ status: newStatus })
    .eq("id", id)
    .eq("status", "pending")
    .select("id, status");

  if (updateErr) {
    return err("update_failed", updateErr.message, 500);
  }

  // If the CAS missed (another request raced us), the row shape is empty.
  if (!updated || updated.length === 0) {
    return err(
      "state_changed",
      "Someone else just changed this swap. Refresh to see the current state.",
      409,
    );
  }

  return NextResponse.json({ id: updated[0].id, status: updated[0].status });
}
