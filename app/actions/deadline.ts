"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function updateDeadline(date: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({ thesis_deadline: date })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/");
  return {};
}
