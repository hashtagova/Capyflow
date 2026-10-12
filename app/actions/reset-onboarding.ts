"use server";

// TEMP: remove after testing
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function resetOnboarding() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("chapters").delete().eq("user_id", user.id);
  await supabase.from("users").update({ thesis_title: null, thesis_deadline: null }).eq("id", user.id);

  redirect("/onboarding");
}
