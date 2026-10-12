"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { updateStreak } from "./streak";
import { checkAndUnlockAchievements } from "./achievements";

export async function savePomodoroSession(data: {
  sessionId: string;
  questId: string | null;
  durationMinutes: number;
  startedAt: string;
  wordCount?: number;
  slideCount?: number;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Single RPC: validates inputs, inserts session row, and awards XP atomically.
  // ON CONFLICT (id) DO NOTHING inside the RPC makes retried requests idempotent.
  const { data: result, error } = await supabase.rpc("save_dip_session", {
    p_session_id:       data.sessionId,
    p_quest_id:         data.questId,
    p_started_at:       data.startedAt,
    p_duration_minutes: data.durationMinutes,
    p_word_count:       data.wordCount  ?? null,
    p_slide_count:      data.slideCount ?? null,
  });

  if (error) return { error: error.message };
  if (!result || result.error) return { error: result?.error ?? "Session save failed" };

  // Idempotent retry — session already saved, no double-XP or double-streak.
  if (result.already_processed) {
    return {
      sessionId:       data.sessionId,
      xpEarned:        0,
      levelUp:         null,
      streakMilestone: null,
      wokeUp:          false,
      newAchievements: [] as never[],
    };
  }

  const streakResult    = await updateStreak(user.id, {
    pomodoros: 1,
    minutes:   data.durationMinutes,
  });
  const newAchievements = await checkAndUnlockAchievements(supabase, user.id);

  revalidatePath("/");
  revalidatePath("/achievements");
  return {
    sessionId:       result.session_id as string,
    xpEarned:        result.xp_earned  as number,
    levelUp:         (result.new_level as number) > (result.old_level as number)
                       ? (result.new_level as number)
                       : null,
    streakMilestone: streakResult?.milestone ?? null,
    wokeUp:          streakResult?.wokeUp ?? false,
    newAchievements,
  };
}

export async function updateSessionCounts(
  sessionId: string,
  wordCount?: number,
  slideCount?: number,
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const updates: Record<string, number | null> = {};
  if (wordCount !== undefined) updates.word_count = wordCount;
  if (slideCount !== undefined) updates.slide_count = slideCount;
  if (Object.keys(updates).length === 0) return { success: true as const };

  await supabase
    .from("pomodoro_sessions")
    .update(updates)
    .eq("id", sessionId)
    .eq("user_id", user.id);

  return { success: true as const };
}
