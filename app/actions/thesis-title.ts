"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function updateThesisTitle(title: string): Promise<{ error?: string }> {
  const trimmed = title.trim();
  if (!trimmed) return { error: "Title cannot be empty" };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({ thesis_title: trimmed })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  revalidatePath("/quest-map");
  return {};
}
