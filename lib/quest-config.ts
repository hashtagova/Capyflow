export const XP_MAP = { easy: 15, medium: 30, hard: 50 } as const;
export type Difficulty = keyof typeof XP_MAP;

export const PRIORITY_CONFIG = {
  0: { label: "Normal", badge: null },
  1: { label: "High ⚡", badge: "⚡ High",  className: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  2: { label: "Urgent 🔥", badge: "🔥 Urgent", className: "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-400" },
} as const;
export type Priority = keyof typeof PRIORITY_CONFIG;
