"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { checkAndUnlockAchievements } from "@/app/actions/achievements";
import type { AchievementDef } from "@/lib/achievements";

export async function updateBuddyCheckin(enabled: boolean) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({ buddy_checkin_enabled: enabled })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/");
  return { success: true as const };
}

export async function updateMeasurementUnit(unit: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({ measurement_unit: unit })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/analytics");
  revalidatePath("/pomodoro");
  return { success: true as const };
}

export async function updateProjectType(projectType: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({ project_type: projectType })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/settings");
  revalidatePath("/achievements");
  revalidatePath("/pomodoro");
  revalidatePath("/quest-map");
  revalidatePath("/analytics");
  revalidatePath("/");
  return { success: true as const };
}

export async function devSwitchProjectType(projectType: string, measurementUnit: string) {
  if (process.env.NODE_ENV === "production") return { error: "Not available in production" };
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("users")
    .update({ project_type: projectType, measurement_unit: measurementUnit })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/achievements");
  revalidatePath("/pomodoro");
  revalidatePath("/quest-map");
  revalidatePath("/analytics");
  return { success: true as const };
}

export async function resetProgress(): Promise<{ error: string } | { success: true }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Delete all chapters (cascades to quests)
  const { error: chaptersError } = await supabase.from("chapters").delete().eq("user_id", user.id);
  if (chaptersError) return { error: chaptersError.message };

  // Delete all pomodoro sessions
  const { error: sessionsError } = await supabase.from("pomodoro_sessions").delete().eq("user_id", user.id);
  if (sessionsError) return { error: sessionsError.message };

  // Delete all daily logs
  const { error: logsError } = await supabase.from("daily_logs").delete().eq("user_id", user.id);
  if (logsError) return { error: logsError.message };

  // Delete all achievements
  const { error: achievementsError } = await supabase.from("achievements").delete().eq("user_id", user.id);
  if (achievementsError) return { error: achievementsError.message };

  // Reset user stats
  const { error: usersError } = await supabase
    .from("users")
    .update({ xp: 0, level: 1, current_streak: 0, streak_days: 0, longest_streak: 0, project_delivered_at: null })
    .eq("id", user.id);
  if (usersError) return { error: usersError.message };

  revalidatePath("/");
  revalidatePath("/settings");
  revalidatePath("/analytics");
  revalidatePath("/quest-map");
  revalidatePath("/achievements");
  return { success: true as const };
}

export async function markProjectDelivered(): Promise<
  { error: string } | { success: true; newAchievements: AchievementDef[] }
> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Server-side completion check — validates that every chapter belonging to
  // this user is at 100% before writing project_delivered_at. The client-side
  // disabled guard is not a sufficient defence against direct action invocation.
  const { data: chapters, error: chaptersError } = await supabase
    .from("chapters")
    .select("progress_pct")
    .eq("user_id", user.id);

  if (chaptersError) return { error: chaptersError.message };
  if (!chapters || chapters.length === 0) return { error: "No chapters found" };
  if (chapters.some((c) => c.progress_pct < 100)) {
    return { error: "Not all chapters are complete" };
  }

  const { error } = await supabase
    .from("users")
    .update({ project_delivered_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) return { error: error.message };

  const newAchievements = await checkAndUnlockAchievements(supabase, user.id);
  revalidatePath("/quest-map");
  revalidatePath("/achievements");
  return { success: true as const, newAchievements };
}
