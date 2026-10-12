import { createClient } from "@/utils/supabase/server";
import { type CapyMood } from "@/lib/cappy";

const STREAK_MILESTONES = [7, 14, 30] as const;

/** Returns YYYY-MM-DD in Europe/Vienna timezone. */
export function getBerlinDate(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toLocaleDateString("en-CA", {
    timeZone: "Europe/Vienna",
  });
}

/**
 * Upserts today's daily_log AND recalculates the Flow Streak.
 *
 * Flow Streak rules (self-compassion design):
 *   - Streak NEVER resets. Missing days only pause it ("Capy sleeps").
 *   - todayLog missing + yesterday active   → newStreak = currentStreak + 1
 *   - todayLog missing + yesterday inactive + first ever → newStreak = 1
 *   - todayLog missing + yesterday inactive + has history → newStreak = currentStreak (wake up)
 *   - todayLog exists  + streak looks wrong (≤ 1) → fix streak
 *   - todayLog exists  + streak correct → no-op (return null)
 */
export async function updateStreak(
  userId: string,
  activity: {
    quests?: number;
    pomodoros?: number;
    minutes?: number;
  }
): Promise<{ newStreak: number; milestone: number | null; wokeUp: boolean } | null> {
  const supabase = createClient();

  const today     = getBerlinDate(0);
  const yesterday = getBerlinDate(-86_400_000);

  // ── 1. Fetch today, yesterday, and user profile in parallel ──
  const [
    { data: existingLog },
    { data: yesterdayLog },
    { data: user },
  ] = await Promise.all([
    supabase
      .from("daily_logs")
      .select("id, quests_completed, total_pomodoros, total_minutes")
      .eq("user_id", userId)
      .eq("date", today)
      .single(),
    supabase
      .from("daily_logs")
      .select("streak_maintained")
      .eq("user_id", userId)
      .eq("date", yesterday)
      .single(),
    supabase
      .from("users")
      .select("current_streak, longest_streak")
      .eq("id", userId)
      .single(),
  ]);

  const isNewEntry           = !existingLog;
  const yesterdayHadActivity = !!yesterdayLog?.streak_maintained;
  const currentStreak        = user?.current_streak ?? 0;
  // Returning after a pause = first log today, no yesterday activity, but has history
  const wokeUp               = isNewEntry && !yesterdayHadActivity && currentStreak > 0;

  // ── 2. Upsert today's daily_log ──
  if (existingLog) {
    await supabase
      .from("daily_logs")
      .update({
        quests_completed: (existingLog.quests_completed ?? 0) + (activity.quests    ?? 0),
        total_pomodoros:  (existingLog.total_pomodoros  ?? 0) + (activity.pomodoros ?? 0),
        total_minutes:    (existingLog.total_minutes    ?? 0) + (activity.minutes   ?? 0),
        streak_maintained: true,
      })
      .eq("id", existingLog.id);
  } else {
    await supabase
      .from("daily_logs")
      .insert({
        user_id:           userId,
        date:              today,
        quests_completed:  activity.quests    ?? 0,
        total_pomodoros:   activity.pomodoros ?? 0,
        total_minutes:     activity.minutes   ?? 0,
        streak_maintained: true,
      });
  }

  // ── 3. Decide whether the streak counter needs updating ──
  let newStreak: number;

  if (isNewEntry) {
    if (yesterdayHadActivity) {
      // Continuing an active streak
      newStreak = currentStreak + 1;
    } else if (currentStreak === 0) {
      // Very first activity ever
      newStreak = 1;
    } else {
      // Waking up after a pause — keep the streak, never reset
      newStreak = currentStreak;
    }
  } else {
    // Today's log already existed (streak may have been set on a previous call today)
    if (yesterdayHadActivity && currentStreak <= 1) {
      // Yesterday had activity but streak is still 1 — it was set incorrectly
      // (e.g. current_streak was 0 when today's first log was written). Fix it.
      newStreak = currentStreak + 1;
    } else {
      // Streak looks correct — nothing to do
      return null;
    }
  }

  // ── 4. Update users table ──
  const newLongest = Math.max(newStreak, user?.longest_streak ?? 0);

  // updateStreak is only called when there IS activity, so never show sleepy here
  const capy_mood: CapyMood =
    newStreak >= 7 ? "cheerleader" :
    newStreak >= 3 ? "rolling" :
    "chill";

  await supabase
    .from("users")
    .update({
      current_streak: newStreak,
      streak_days:    newStreak,
      longest_streak: newLongest,
      cappy_mood:     capy_mood,
    })
    .eq("id", userId);

  const milestone =
    (STREAK_MILESTONES as readonly number[]).includes(newStreak) ? newStreak : null;

  return { newStreak, milestone, wokeUp };
}

/** @deprecated Use updateStreak() instead */
export async function checkAndUpdateStreak(
  _supabase: ReturnType<typeof createClient>,
  userId: string
) {
  return updateStreak(userId, {});
}
