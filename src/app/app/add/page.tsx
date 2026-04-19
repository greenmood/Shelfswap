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
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      <div className="flex items-center justify-between">
        <Link
          href="/app"
          className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          ← Library
        </Link>
      </div>

      <div className="mt-6 space-y-1">
        <h1 className="text-2xl font-semibold">Add a book</h1>
        <p className="text-sm text-neutral-500">
          Search Open Library, pick a match, set condition, save.
        </p>
      </div>

      <AddBookForm />
    </main>
  );
}
