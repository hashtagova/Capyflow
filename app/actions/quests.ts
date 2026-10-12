"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { updateStreak } from "./streak";
import { checkAndUnlockAchievements } from "./achievements";

import { XP_MAP } from "@/lib/quest-config";

// ── Shared chapter progress recalc ───────────────────────────
async function recalcChapter(
  supabase: ReturnType<typeof createClient>,
  chapterId: string
): Promise<{ pct: number }> {
  const { data: all } = await supabase
    .from("quests")
    .select("status")
    .eq("chapter_id", chapterId);

  const total = all?.length ?? 0;
  const done = all?.filter((q) => q.status === "done").length ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const status = pct === 100 ? "done" : pct > 0 ? "in_progress" : "not_started";

  await supabase
    .from("chapters")
    .update({ progress_pct: pct, status })
    .eq("id", chapterId);

  return { pct };
}

// ── Add quest ────────────────────────────────────────────────
export async function addQuest(data: {
  chapterId: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  priority?: number;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Next order index
  const { data: last } = await supabase
    .from("quests")
    .select("order_index")
    .eq("chapter_id", data.chapterId)
    .order("order_index", { ascending: false })
    .limit(1)
    .single();

  const { data: quest, error: insertError } = await supabase
    .from("quests")
    .insert({
      chapter_id: data.chapterId,
      user_id: user.id,
      title: data.title,
      difficulty: data.difficulty,
      xp_reward: XP_MAP[data.difficulty],
      priority: data.priority ?? 0,
      status: "todo",
      order_index: (last?.order_index ?? -1) + 1,
    })
    .select("id, title, difficulty, xp_reward, status, order_index, priority, notes")
    .single();

  if (insertError || !quest) return { error: "Couldn't add quest — try again" };

  await recalcChapter(supabase, data.chapterId);

  revalidatePath(`/chapters/${data.chapterId}`);
  revalidatePath("/quest-map");
  revalidatePath("/");
  return { quest };
}

// ── Mark complete ────────────────────────────────────────────
export async function markQuestComplete(questId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Single RPC: quest lock, chapter lock, xp_awarded_at guard, atomic XP
  // increment, chapter progress recalc, and atomic milestone claim — all in
  // one transaction. See migration 014 for full documentation.
  const { data: rpc, error: rpcError } = await supabase.rpc(
    "complete_quest_and_award_xp",
    { p_quest_id: questId }
  );

  if (rpcError)      return { error: rpcError.message };
  if (!rpc)          return { error: "Quest completion failed" };
  if (rpc.error)     return { error: rpc.error as string };

  const {
    chapter_id,
    xp_earned,
    old_level,
    new_level,
    chapter_completed,
  } = rpc as {
    chapter_id: string;
    xp_earned: number;
    old_level: number;
    new_level: number;
    chapter_completed: boolean;
  };

  const streakResult    = await updateStreak(user.id, { quests: 1 });
  const newAchievements = await checkAndUnlockAchievements(supabase, user.id);

  revalidatePath("/");
  revalidatePath("/quest-map");
  revalidatePath(`/chapters/${chapter_id}`);
  revalidatePath("/achievements");

  return {
    success:          true as const,
    xpEarned:         xp_earned,
    levelUp:          new_level > old_level ? new_level : null,
    chapterCompleted: chapter_completed,
    streakMilestone:  streakResult?.milestone ?? null,
    wokeUp:           streakResult?.wokeUp ?? false,
    newAchievements,
  };
}

// ── Mark todo (undo complete) ────────────────────────────────
export async function markQuestTodo(questId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: quest } = await supabase
    .from("quests")
    .select("id, chapter_id, xp_reward, status")
    .eq("id", questId)
    .eq("user_id", user.id)
    .single();

  if (!quest) return { error: "Quest not found" };
  if (quest.status !== "done") return { error: "Quest is not completed" };

  // Deliberately does not clear xp_awarded_at — XP is never deducted on reopen.
  await supabase
    .from("quests")
    .update({ status: "todo", completed_at: null })
    .eq("id", questId);

  await recalcChapter(supabase, quest.chapter_id);

  revalidatePath("/");
  revalidatePath("/quest-map");
  revalidatePath(`/chapters/${quest.chapter_id}`);

  return { success: true as const };
}

// ── Update quest (field editing only — title, difficulty, priority, notes) ──
// Status transitions are intentionally excluded: use markQuestComplete /
// markQuestTodo. XP is awarded only through the complete_quest_and_award_xp RPC.
export async function updateQuest(
  questId: string,
  data: {
    title: string;
    difficulty: "easy" | "medium" | "hard";
    priority: number;
    notes: string;
  }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: current } = await supabase
    .from("quests")
    .select("id, chapter_id")
    .eq("id", questId)
    .eq("user_id", user.id)
    .single();

  if (!current) return { error: "Quest not found" };

  const newXpReward = XP_MAP[data.difficulty];

  const { error: updateError } = await supabase
    .from("quests")
    .update({
      title:      data.title.trim(),
      difficulty: data.difficulty,
      xp_reward:  newXpReward,
      priority:   data.priority,
      notes:      data.notes.trim() || null,
    })
    .eq("id", questId);

  if (updateError) return { error: updateError.message };

  await recalcChapter(supabase, current.chapter_id);

  revalidatePath("/");
  revalidatePath("/quest-map");
  revalidatePath(`/chapters/${current.chapter_id}`);

  return {
    success: true as const,
    updated: {
      title:      data.title.trim(),
      difficulty: data.difficulty,
      xp_reward:  newXpReward,
      priority:   data.priority,
      notes:      data.notes.trim() || null,
    },
  };
}

// ── Save quest notes ─────────────────────────────────────────
export async function saveQuestNotes(questId: string, notes: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("quests")
    .update({ notes: notes || null })
    .eq("id", questId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath(`/chapters`);
  return { success: true as const };
}

// ── Delete quest ─────────────────────────────────────────────
export async function deleteQuest(questId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: quest } = await supabase
    .from("quests")
    .select("id, chapter_id")
    .eq("id", questId)
    .eq("user_id", user.id)
    .single();

  if (!quest) return { error: "Quest not found" };

  await supabase.from("quests").delete().eq("id", questId);
  await recalcChapter(supabase, quest.chapter_id);

  revalidatePath("/");
  revalidatePath("/quest-map");
  revalidatePath(`/chapters/${quest.chapter_id}`);

  return { success: true as const };
}
