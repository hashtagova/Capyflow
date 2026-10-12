"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export interface OnboardingData {
  thesisTitle: string;
  deadline: string;
  chapters: string[];
  pomodoroMinutes: number;
  projectType: string;
  measurementUnit: string;
  buddyCheckinEnabled: boolean;
}

export async function completeOnboarding(
  data: OnboardingData
): Promise<{ error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Don't redirect() here — it breaks inside useTransition. Return an error
    // so the client can decide what to do (e.g. router.push("/login")).
    return { error: "Session expired. Please sign in again." };
  }

  const { error: userError } = await supabase
    .from("users")
    .update({
      thesis_title: data.thesisTitle.trim(),
      thesis_deadline: data.deadline || null,
      default_pomodoro_minutes: data.pomodoroMinutes,
      project_type: data.projectType,
      measurement_unit: data.measurementUnit,
      buddy_checkin_enabled: data.buddyCheckinEnabled,
    })
    .eq("id", user.id);

  if (userError) return { error: userError.message };

  if (data.chapters.length > 0) {
    // Delete any existing chapters first so re-submitting onboarding never creates duplicates
    await supabase.from("chapters").delete().eq("user_id", user.id);

    const { error: chaptersError } = await supabase.from("chapters").insert(
      data.chapters.map((title, index) => ({
        user_id: user.id,
        title,
        order_index: index,
        status: "not_started",
        progress_pct: 0,
      }))
    );

    if (chaptersError) return { error: chaptersError.message };
  }

  redirect("/");
}
