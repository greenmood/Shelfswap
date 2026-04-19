import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AppHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-sm text-neutral-500">
          Signed in as <span className="font-mono">{user.email}</span>
        </p>
        <p className="text-sm text-neutral-500">
          (Catalog UI lands in Week 2.)
        </p>
      </div>
    </main>
  );
}
