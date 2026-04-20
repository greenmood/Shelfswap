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
    <main className="mx-auto flex min-h-screen max-w-md flex-col md:max-w-lg p-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app"
          className="text-sm text-muted hover:text-ink dark:hover:text-neutral-100"
        >
          ← Library
        </Link>
      </div>

      <div className="mt-6 space-y-1">
        <h1 className="font-serif text-2xl font-medium tracking-tight">Add a book</h1>
        <p className="text-sm text-muted">
          Search Open Library, pick a match, set condition, save.
        </p>
      </div>

      <AddBookForm />
    </main>
  );
}
