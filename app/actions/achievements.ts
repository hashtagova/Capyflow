import { createClient } from "@/utils/supabase/server";
import { ACHIEVEMENTS, type AchievementDef } from "@/lib/achievements";

/**
 * Queries all needed stats, checks every achievement condition, and inserts
 * any newly earned rows. Returns only the achievements that were just unlocked.
 * Safe to call after every quest/pomodoro completion — duplicate inserts are
 * ignored by the UNIQUE(user_id, achievement_key) constraint.
 */
export async function checkAndUnlockAchievements(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<AchievementDef[]> {
  const [userRes, questsRes, pomoRes, chaptersRes, unlockedRes, recentLogsRes, deepDayRes, activeDaysRes] = await Promise.all([
    supabase
      .from("users")
      .select("current_streak, level, xp, project_delivered_at")
      .eq("id", userId)
      .single(),
    supabase
      .from("quests")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "done"),
    supabase
      .from("pomodoro_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("completed", true),
    supabase
      .from("chapters")
      .select("progress_pct")
      .eq("user_id", userId),
    supabase
      .from("achievements")
      .select("achievement_key")
      .eq("user_id", userId),
    // Last 2 active log dates — used to detect absence gaps
    supabase
      .from("daily_logs")
      .select("date")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(2),
    // Any day with 5+ pomodoros — for Deep Day
    supabase
      .from("daily_logs")
      .select("date")
      .eq("user_id", userId)
      .gte("total_pomodoros", 5)
      .limit(1),
    // Count of distinct active days — for Consistent Week
    supabase
      .from("daily_logs")
      .select("date", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("total_pomodoros", 1),
  ]);

  const user = userRes.data;
  if (!user) return [];

  const totalQuests     = questsRes.count ?? 0;
  const totalPomodoros  = pomoRes.count ?? 0;
  const chapters        = chaptersRes.data ?? [];
  const completedChapters = chapters.filter((c) => c.progress_pct === 100).length;
  const alreadyUnlocked = new Set(
    (unlockedRes.data ?? []).map((a) => a.achievement_key)
  );

  // Absence gap: days between the two most recent log entries
  const recentDates = (recentLogsRes.data ?? []).map((r) => r.date);
  const dayGap = recentDates.length === 2
    ? Math.round(
        (new Date(recentDates[0]).getTime() - new Date(recentDates[1]).getTime()) / 86_400_000
      )
    : 0;

  const hasDeepDay = (deepDayRes.data ?? []).length > 0;
  const activeDays = activeDaysRes.count ?? 0;

  const conditions: Record<string, boolean> = {
    first_quest:  totalQuests >= 1,
    streak_3:     totalQuests >= 10,      // Quest Master: 10 quests completed
    streak_7:     totalPomodoros >= 7,   // Seven Sessions: 7 total pomodoros
    level_2:      user.level >= 2,
    level_5:      user.level >= 5,
    pomodoro_5:   totalPomodoros >= 1,   // First Flow: first ever pomodoro
    pomodoro_20:  hasDeepDay,            // Deep Day: 5+ pomodoros in one day
    chapter_done:    completedChapters >= 1,
    all_chapters:    dayGap >= 4,           // Gentle Return: 3+ days of absence
    xp_500:          user.xp >= 500,
    consistent_week:   activeDays >= 7,
    project_delivered: !!user.project_delivered_at,
  };

  const toUnlock = ACHIEVEMENTS.filter(
    (a) => conditions[a.key] && !alreadyUnlocked.has(a.key)
  );

  if (toUnlock.length === 0) return [];

  await supabase.from("achievements").insert(
    toUnlock.map((a) => ({ user_id: userId, achievement_key: a.key }))
  );

  return toUnlock;
}
