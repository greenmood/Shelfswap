import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { AddBookForm } from "./add-book-form";

export default async function AddBookPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6 md:max-w-lg">
      <Link
        href="/app"
        className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted hover:text-ink"
      >
        ← Library
      </Link>

      <h1 className="mt-4 font-serif text-2xl font-medium tracking-tight">
        Add a book
      </h1>

      <AddBookForm />
    </main>
  );
}
