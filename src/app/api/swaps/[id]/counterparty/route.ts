import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Privacy-sensitive endpoint: reveals counterparty's first name and contact
// handles ONLY when the caller is a party to an accepted/completed swap.
//
// ALL failure modes collapse to a single 404 with no body detail. This is
// deliberate — a differentiated error ("not a party" vs "not yet accepted")
// would be an oracle: attackers could enumerate which swap IDs exist and
// which statuses they're in.
function notFoundOnly() {
  return new NextResponse(null, { status: 404 });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const user = await getCurrentUser();
  if (!user) {
    return notFoundOnly();
  }

  // Admin client: we do the access check ourselves in code. This also
  // bypasses the swap_requests RLS so a single query confirms existence +
  // status + caller-is-party in one shot.
  const admin = createAdminClient();

  const { data: swap } = await admin
    .from("swap_requests")
    .select("id, status, requester_id, owner_id")
    .eq("id", id)
    .in("status", ["accepted", "completed"])
    .maybeSingle();

  if (!swap) {
    return notFoundOnly();
  }

  // Gate 3: caller must be a party.
  const isParty =
    swap.requester_id === user.id || swap.owner_id === user.id;
  if (!isParty) {
    return notFoundOnly();
  }

  // Counterparty = the other user on this swap.
  const counterpartyId =
    swap.requester_id === user.id ? swap.owner_id : swap.requester_id;

  // users RLS is self-only — admin client required to read someone else's
  // handle fields.
  const { data: party } = await admin
    .from("users")
    .select("first_name, whatsapp, telegram, instagram")
    .eq("id", counterpartyId)
    .maybeSingle();

  if (!party) {
    return notFoundOnly();
  }

  return NextResponse.json(
    {
      first_name: party.first_name,
      whatsapp: party.whatsapp,
      telegram: party.telegram,
      instagram: party.instagram,
    },
    {
      headers: {
        // Never cache privileged data.
        "Cache-Control": "no-store",
      },
    },
  );
}
