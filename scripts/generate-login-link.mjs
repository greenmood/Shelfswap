// Generate a one-time login link for a specific user. Run locally:
//
//   npm run gen-login-link -- her@email.com
//
// Optional env: APP_ORIGIN (defaults to https://shelfswap.dev). Override when
// testing locally:
//
//   APP_ORIGIN=http://localhost:3000 npm run gen-login-link -- her@email.com
//
// The script uses the admin client (service role) to generate a hashed
// token, then prints a /auth/onetime URL that works in any browser — no
// PKCE verifier cookie required. Share the URL via a secure channel
// (WhatsApp, signal, SMS). Single-use, expires per Supabase's configured TTL.

import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
if (!email) {
  console.error(
    "Usage: npm run gen-login-link -- <email>\n" +
      "Optional: APP_ORIGIN=... to override the redirect base.",
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY. Run via npm " +
      "script so --env-file=.env.local is applied.",
  );
  process.exit(1);
}

const appOrigin = process.env.APP_ORIGIN ?? "https://shelfswap.dev";

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email,
});

if (error) {
  console.error("generateLink failed:", error.message);
  process.exit(1);
}

const tokenHash = data?.properties?.hashed_token;
if (!tokenHash) {
  console.error("No hashed_token returned by Supabase.");
  process.exit(1);
}

const link = `${appOrigin}/auth/onetime?token_hash=${encodeURIComponent(
  tokenHash,
)}&next=/app`;

console.log();
console.log(`One-time login link for ${email}:`);
console.log();
console.log(link);
console.log();
console.log("Single-use. Share via a secure channel.");
