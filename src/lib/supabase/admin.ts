import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Admin client — uses the service-role / secret key and bypasses RLS.
// NEVER import this from a client component. Server-only (route handlers,
// server actions, server components).
//
// Why this exists: some tables (e.g. swap_requests) have no INSERT/UPDATE
// policies because their state machine is enforced in TypeScript on the
// server. Writes to those tables must come through this client.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
