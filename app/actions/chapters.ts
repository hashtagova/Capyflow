"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function addChapter(title: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Find max order_index for this user
  const { data: existing } = await supabase
    .from("chapters")
    .select("order_index")
    .eq("user_id", user.id)
    .order("order_index", { ascending: false })
    .limit(1);

  const nextIndex = existing && existing.length > 0 ? (existing[0].order_index ?? 0) + 1 : 0;

  const { data, error } = await supabase
    .from("chapters")
    .insert({ user_id: user.id, title: title.trim(), order_index: nextIndex, status: "not_started", progress_pct: 0 })
    .select("id, title, status, progress_pct, order_index")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/quest-map");
  return { chapter: data };
}

export async function renameChapter(chapterId: string, newTitle: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("chapters")
    .update({ title: newTitle.trim() })
    .eq("id", chapterId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/quest-map");
  return { success: true };
}

export async function deleteChapter(chapterId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Delete quests first (FK constraint)
  await supabase.from("quests").delete().eq("chapter_id", chapterId).eq("user_id", user.id);

  const { error } = await supabase
    .from("chapters")
    .delete()
    .eq("id", chapterId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/quest-map");
  return { success: true };
}

export async function updateChapterDeadline(chapterId: string, deadline: string | null) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("chapters")
    .update({ deadline })
    .eq("id", chapterId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/quest-map");
  revalidatePath(`/chapters/${chapterId}`);
  return { success: true };
}

export async function reorderChapters(orderedIds: string[]) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("chapters").update({ order_index: index }).eq("id", id).eq("user_id", user.id)
    )
  );

  revalidatePath("/quest-map");
  return { success: true };
}
