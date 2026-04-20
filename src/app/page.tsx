import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";

// Root "/" has no UI of its own: send authed users into the app, anonymous
// visitors to login. Keeps shared links (`shelfswap.dev`) going somewhere
// meaningful regardless of session state.
export default async function RootPage() {
  const user = await getCurrentUser();
  redirect(user ? "/app" : "/login");
}
