"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";

export type AddBookInput = {
  title: string;
  author: string | null;
  cover_url: string | null;
  condition: "good" | "worn";
};

export async function addBook(input: AddBookInput) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("unauthorized");
  }
  const supabase = await createClient();

  const title = input.title.trim();
  if (!title) {
    throw new Error("Title is required.");
  }

  const { error } = await supabase.from("books").insert({
    owner_id: user.id,
    title,
    author: input.author?.trim() || null,
    cover_url: input.cover_url,
    condition: input.condition,
    is_available: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Invalidate the Library's cache so the new book shows up on return.
  revalidatePath("/app");
  redirect("/app");
}
