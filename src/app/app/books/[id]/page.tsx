import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EditBookForm } from "./edit-book-form";

export default async function EditBookPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: book } = await supabase
    .from("books")
    .select("id, title, author, cover_url, condition, is_available")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!book) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col p-6">
      <Link
        href="/app"
        className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
      >
        ← Library
      </Link>

      <h1 className="mt-6 text-2xl font-semibold">Edit book</h1>

      <EditBookForm
        book={{
          id: book.id,
          title: book.title,
          author: book.author,
          cover_url: book.cover_url,
          condition: book.condition,
        }}
      />
    </main>
  );
}
