"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setAvailability(bookId: string, isAvailable: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("unauthorized");
  }

  // RLS policy books_update_own gates this to rows where owner_id = auth.uid().
  // We also scope the update to owner_id for a clearer query plan and to leave
  // an explicit authorisation trail in the code.
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
