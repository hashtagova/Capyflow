export type CapyMood =
  | "sleepy"       // no activity today — Capy is napping (paused or new user)
  | "chill"        // active today, flow streak 1–2
  | "rolling"      // active today, flow streak 3–6
  | "cheerleader"  // active today, flow streak 7+
  | "happy"        // active today, very first day
  | "deadline"     // thesis deadline within 7 days
  | "proud";       // thesis 100% complete

/**
 * Priority (highest → lowest):
 *   proud → deadline → sleepy (no activity today) → cheerleader → rolling → chill → happy
 */
export function getCapyMood({
  streak,
  activeToday,
  overallProgress,
  deadlineDaysLeft,
  daysSinceLastActive,
}: {
  streak: number;
  activeToday: boolean;
  overallProgress: number;
  deadlineDaysLeft: number | null;
  daysSinceLastActive: number | null;
}): CapyMood {
  if (overallProgress >= 100) return "proud";
  if (deadlineDaysLeft !== null && deadlineDaysLeft >= 0 && deadlineDaysLeft <= 14)
    return "deadline";
  // Sleepy only if away for more than 1 day — not just because no work done yet today
  if (!activeToday && daysSinceLastActive !== null && daysSinceLastActive > 1) return "sleepy";
  if (streak >= 7) return "cheerleader";
  if (streak >= 3) return "rolling";
  if (streak >= 1) return "chill";
  return "happy"; // first-ever activity day
}

// Mood emoji shown next to 🦫 in the greeting
export const MOOD_EMOJI: Record<CapyMood, string> = {
  sleepy:      "😴",
  chill:       "🙂",
  rolling:     "😊",
  cheerleader: "🔥",
  happy:       "🎉",
  deadline:    "😰",
  proud:       "🎓",
};

// Custom Capy illustration per mood
export const MOOD_IMAGE: Record<CapyMood, string> = {
  sleepy:      "/images/cappy-sleeping.png",
  chill:       "/images/capy-chill.png",
  rolling:     "/images/capy-rolling.png",
  cheerleader: "/images/capy-cheerleader.png",
  happy:       "/images/capy-happy.png",
  deadline:    "/images/capy-urgent.png",
  proud:       "/images/capy-proud.png",
};
