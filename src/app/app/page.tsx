import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./sign-out-button";

export default async function AppHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("first_name")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Library</h1>
        <Link
          href="/app/profile"
          aria-label="Profile"
          className="text-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          ⚙︎
        </Link>
      </header>

      <div className="mt-6 space-y-3">
        {profile?.first_name ? (
          <p className="text-sm text-neutral-500">
            Hi, {profile.first_name}.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-neutral-500">
              Set up your profile to get started.
            </p>
            <Link
              href="/app/profile"
              className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-neutral-900"
            >
              Complete profile
            </Link>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Link
          href="/app/add"
          className="inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
        >
          <span aria-hidden>＋</span> Add book
        </Link>
      </div>

      <p className="mt-8 text-sm text-neutral-500">
        Catalog list lands next.
      </p>

      <div className="mt-auto pt-8">
        <SignOutButton />
      </div>
    </main>
  );
}
