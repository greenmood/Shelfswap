import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("first_name, whatsapp, telegram, instagram")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          ← Library
        </Link>
      </div>

      <div className="mt-8 space-y-2">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-sm text-neutral-500">
          Signed in as <span className="font-mono">{user.email}</span>
        </p>
      </div>

      <ProfileForm
        initial={{
          first_name: profile?.first_name ?? "",
          whatsapp: profile?.whatsapp ?? "",
          telegram: profile?.telegram ?? "",
          instagram: profile?.instagram ?? "",
        }}
      />
    </main>
  );
}
