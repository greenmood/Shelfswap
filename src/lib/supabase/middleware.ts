import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the auth token by probing the session. Wrapped in try/catch
  // because Supabase Auth has its own rate limits on /auth/v1/user; if we
  // trip one, getUser() throws — and an unhandled throw in middleware 500s
  // every page. Silent pass-through is safe: downstream server components do
  // their own getUser() and will redirect to /login if the session is truly
  // invalid.
  try {
    await supabase.auth.getUser();
  } catch (err) {
    console.warn("[proxy] auth refresh skipped:", (err as Error).message);
  }

  return response;
}
