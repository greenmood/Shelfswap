import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // setAll is called from a Server Component, which can't mutate
            // cookies. The middleware refresh keeps the session alive, so
            // ignoring this is safe.
          }
        },
      },
    },
  );
}

// Cached user lookup. React's `cache()` dedupes the fn's result within a
// single render pass, so multiple components in the same request share one
// /auth/v1/user call. Without this, page + layout + other callers each hit
// Supabase Auth and we race its rate limits.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
