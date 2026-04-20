import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // If viewing yourself, bounce to the editable profile.
  if (id === user.id) {
    redirect("/app/profile");
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("public_profiles")
    .select("id, first_name, has_whatsapp, has_telegram, has_instagram")
    .eq("id", id)
    .single();

  if (!profile) {
    notFound();
  }

  // Order: Telegram, Instagram, WhatsApp. Safer defaults first per build_order.
  const channels = [
    profile.has_telegram && "Telegram",
    profile.has_instagram && "Instagram",
    profile.has_whatsapp && "WhatsApp",
  ].filter(Boolean) as string[];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col md:max-w-lg p-6">
      <Link
        href="/app/discover"
        className="text-sm text-muted hover:text-ink dark:hover:text-neutral-100"
      >
        ← Discover
      </Link>

      <div className="mt-8 space-y-1">
        <h1 className="font-serif text-2xl font-medium tracking-tight">{profile.first_name ?? "—"}</h1>
      </div>

      <section className="mt-8 space-y-3 rounded-md border border-subtle bg-paper p-4 dark:border-neutral-800">
        <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted">
          Reachable via
        </p>
        {channels.length > 0 ? (
          <p className="text-sm">{channels.join(" · ")}</p>
        ) : (
          <p className="text-sm text-muted">
            No contact channels set up.
          </p>
        )}
        <p className="text-xs text-muted">
          Full handles are revealed once a swap is accepted.
        </p>
      </section>
    </main>
  );
}
