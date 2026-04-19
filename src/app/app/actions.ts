"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import type { BookCondition } from "@/components/condition-radio";

export async function setAvailability(bookId: string, isAvailable: boolean) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("unauthorized");
  }
  const supabase = await createClient();

  const { error } = await supabase
    .from("books")
    .update({ is_available: isAvailable })
    .eq("id", bookId)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
}

export async function updateBook(input: {
  id: string;
  title: string;
  author: string | null;
  condition: BookCondition;
}) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("unauthorized");
  }
  const supabase = await createClient();

  const title = input.title.trim();
  if (!title) {
    throw new Error("Title is required.");
  }

  const { error } = await supabase
    .from("books")
    .update({
      title,
      author: input.author?.trim() || null,
      condition: input.condition,
    })
    .eq("id", input.id)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  redirect("/app");
}

export async function deleteBook(id: string) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("unauthorized");
  }
  const supabase = await createClient();

  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/app");
  redirect("/app");
}
