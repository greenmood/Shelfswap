import { NextResponse, type NextRequest } from "next/server";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendSwapStatusEmail,
  type SwapStatusEmailKind,
} from "@/lib/email/send";

type Action = "accept" | "decline" | "cancel" | "complete";

const ACTIONS: Action[] = ["accept", "decline", "cancel", "complete"];

// State machine: who can fire each action, what state it requires, what
// state it moves to, and an optional "kind" marking this as a complete
// transition (which needs a transactional book flip and goes through RPC).
type ActorKind = "owner" | "requester" | "either";
type FromStatus = "pending" | "accepted";
type NewStatus = "accepted" | "declined" | "cancelled" | "completed";

const TRANSITIONS: Record<
  Action,
  { actor: ActorKind; from: FromStatus | FromStatus[]; newStatus: NewStatus }
> = {
  accept: { actor: "owner", from: "pending", newStatus: "accepted" },
  decline: { actor: "owner", from: "pending", newStatus: "declined" },
  cancel: {
    actor: "either",
    from: ["pending", "accepted"],
    newStatus: "cancelled",
  },
  complete: { actor: "either", from: "accepted", newStatus: "completed" },
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
  const user = await getCurrentUser();
  if (!user) {
    return err("unauthorized", "Sign in to update a swap.", 401);
  }
  const supabase = await createClient();

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
  const spec = TRANSITIONS[action];
  const isOwner = swap.owner_id === user.id;
  const isRequester = swap.requester_id === user.id;

  const canFire =
    (spec.actor === "owner" && isOwner) ||
    (spec.actor === "requester" && isRequester) ||
    (spec.actor === "either" && (isOwner || isRequester));

  if (!canFire) {
    return err(
      "forbidden",
      `Only the ${spec.actor} can ${action} this swap.`,
      403,
    );
  }

  // --- Current-state guard -------------------------------------------
  const allowedFrom = Array.isArray(spec.from) ? spec.from : [spec.from];
  if (!allowedFrom.includes(swap.status as FromStatus)) {
    return err(
      "state_changed",
      `This swap is ${swap.status} — can't ${action}.`,
      409,
    );
  }
  // Remember the pre-transition status so the notifier can tailor copy
  // (e.g. cancelled-from-accepted vs cancelled-from-pending).
  const fromStatus = swap.status as FromStatus;

  // --- Apply the transition ------------------------------------------
  const admin = createAdminClient();
  let resultStatus: NewStatus;

  if (action === "complete") {
    // complete touches two tables (swap + both books). Must be atomic, so we
    // call the complete_swap() Postgres function which wraps it in one
    // transaction and returns null on CAS miss.
    const { data: rpcResult, error: rpcErr } = await admin.rpc(
      "complete_swap",
      {
        p_swap_id: id,
        p_user_id: user.id,
      },
    );
    if (rpcErr) {
      return err("update_failed", rpcErr.message, 500);
    }
    if (rpcResult === null) {
      return err(
        "state_changed",
        "Someone else just changed this swap. Refresh to see the current state.",
        409,
      );
    }
    resultStatus = "completed";
  } else {
    // Single-table transitions use a simple conditional update.
    const { data: updated, error: updateErr } = await admin
      .from("swap_requests")
      .update({ status: spec.newStatus })
      .eq("id", id)
      .in("status", allowedFrom)
      .select("id, status");

    if (updateErr) {
      return err("update_failed", updateErr.message, 500);
    }
    if (!updated || updated.length === 0) {
      return err(
        "state_changed",
        "Someone else just changed this swap. Refresh to see the current state.",
        409,
      );
    }
    resultStatus = spec.newStatus;
  }

  // Best-effort: notify the other party and log. Completed transitions skip
  // email for now (people have already coordinated via handle reveal); the
  // three pending-state transitions still notify.
  if (
    resultStatus === "accepted" ||
    resultStatus === "declined" ||
    resultStatus === "cancelled"
  ) {
    await notifyOtherParty({
      admin,
      swap,
      actorUserId: user.id,
      newStatus: resultStatus as SwapStatusEmailKind,
      fromStatus,
      appOrigin: new URL(request.url).origin,
    });
  }

  return NextResponse.json({ id: swap.id, status: resultStatus });
}

async function notifyOtherParty(args: {
  admin: ReturnType<typeof createAdminClient>;
  swap: { id: string; requester_id: string; owner_id: string };
  actorUserId: string;
  newStatus: SwapStatusEmailKind;
  fromStatus: FromStatus;
  appOrigin: string;
}) {
  const { admin, swap, actorUserId, newStatus, fromStatus, appOrigin } = args;

  // Derive from the authenticated actor — cancel can now be either side.
  const actorId = actorUserId;
  const recipientId =
    actorUserId === swap.owner_id ? swap.requester_id : swap.owner_id;

  let emailOk = false;
  try {
    const [recipientUser, recipientProfile, actorProfile, swapDetail] =
      await Promise.all([
        admin.from("users").select("email").eq("id", recipientId).single(),
        admin
          .from("public_profiles")
          .select("first_name")
          .eq("id", recipientId)
          .single(),
        admin
          .from("public_profiles")
          .select("first_name")
          .eq("id", actorId)
          .single(),
        admin
          .from("swap_requests")
          .select(
            "requested:requested_book_id(title), offered:offered_book_id(title)",
          )
          .eq("id", swap.id)
          .single(),
      ]);

    const recipientEmail = recipientUser.data?.email;
    const detail = swapDetail.data as unknown as {
      requested?: { title?: string };
      offered?: { title?: string };
    } | null;
    const requestedTitle = detail?.requested?.title ?? "a book";
    const offeredTitle = detail?.offered?.title ?? "a book";

    if (recipientEmail) {
      await sendSwapStatusEmail({
        to: recipientEmail,
        status: newStatus,
        fromStatus,
        recipientFirstName: recipientProfile.data?.first_name ?? null,
        actorFirstName: actorProfile.data?.first_name ?? null,
        requestedTitle,
        offeredTitle,
        swapUrl: `${appOrigin}/app/swaps/${swap.id}`,
      });
      emailOk = true;
    }
  } catch (sendErr) {
    console.error("[swaps] notify status change failed:", sendErr);
  }

  await admin.from("email_log").insert({
    to_user_id: recipientId,
    kind: emailOk ? `swap_${newStatus}` : `swap_${newStatus}_failed`,
    swap_request_id: swap.id,
  });
}
