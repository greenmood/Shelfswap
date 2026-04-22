import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { WishesList, type Wish } from "./wishes-list";

export default async function WishesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("my_wishes")
    .select(
      "book_id, title, author, cover_url, condition, is_available, owner_id, owner_first_name, wished_at",
    )
    .order("wished_at", { ascending: false });

  const initial: Wish[] = (data ?? []) as Wish[];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6 pb-24 md:max-w-lg md:pb-6">
      <Link
        href="/app"
        className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted hover:text-ink"
      >
        ← Library
      </Link>

      <h1 className="mt-4 font-serif text-2xl font-medium tracking-tight">
        My wishes
      </h1>
      <p className="mt-2 text-sm text-muted">
        Books you&rsquo;ve hearted. Propose when the owner has something
        available.
      </p>

      <WishesList initial={initial} />
    </main>
  );
}
