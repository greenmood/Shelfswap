import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// One-time login via a server-generated hashed_token — used as a support
// escape hatch when a user's normal magic-link flow is blocked (in-app
// browsers, email prefetching, cross-device taps, etc.). verifyOtp with a
// token_hash does not require the PKCE code_verifier cookie, so it works in
// any browser on any device.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const next = searchParams.get("next") ?? "/app";

  if (tokenHash) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
