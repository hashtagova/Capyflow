"use server";

import { createClient } from "@/utils/supabase/server";

export async function getBuddyCheckinProfile(): Promise<{
  enabled: boolean;
  isDeadlineDay: boolean;
} | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("buddy_checkin_enabled, thesis_deadline")
    .eq("id", user.id)
    .single();

  if (!data) return null;

  const isDeadlineDay = data.thesis_deadline
    ? Math.ceil(
        (new Date(data.thesis_deadline + "T23:59:59").getTime() - Date.now()) / 86_400_000
      ) === 0
    : false;

  return { enabled: data.buddy_checkin_enabled ?? true, isDeadlineDay };
}

export async function saveBuddyCheckin(mood: string, note?: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("buddy_checkins").insert({
    user_id: user.id,
    mood,
    note: note?.trim() || null,
  });

  if (error) return { error: error.message };
  return { success: true as const };
}
