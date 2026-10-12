"use server";

import { createClient } from "@/utils/supabase/server";
import type { MicroTask } from "@/app/chapters/[id]/QuestItem";

export async function addMicroTask(questId: string, title: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: last } = await supabase
    .from("micro_tasks")
    .select("order_index")
    .eq("quest_id", questId)
    .eq("user_id", user.id)
    .order("order_index", { ascending: false })
    .limit(1)
    .single();

  const nextIndex = last ? (last.order_index ?? 0) + 1 : 0;

  const { data, error } = await supabase
    .from("micro_tasks")
    .insert({ quest_id: questId, user_id: user.id, title: title.trim(), order_index: nextIndex })
    .select("id, title, completed, order_index")
    .single();

  if (error) return { error: error.message };
  return { microTask: data as MicroTask };
}

export async function toggleMicroTask(microTaskId: string, completed: boolean) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("micro_tasks")
    .update({ completed })
    .eq("id", microTaskId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true as const };
}

export async function deleteMicroTask(microTaskId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("micro_tasks")
    .delete()
    .eq("id", microTaskId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true as const };
}
