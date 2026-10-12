"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/language-context";

type Difficulty = "easy" | "medium" | "hard";

const STYLES: Record<Difficulty, string> = {
  easy:   "bg-emerald-100 text-emerald-700",
  medium: "bg-[#F0E4D0] text-[#A86B2E]",
  hard:   "bg-rose-100 text-rose-700",
};

interface Props {
  difficulty: Difficulty;
}

export function DifficultyBadge({ difficulty }: Props) {
  const { t } = useTranslations();
  const LABEL: Record<Difficulty, string> = {
    easy:   t.easy,
    medium: t.medium,
    hard:   t.hard,
  };

  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", STYLES[difficulty])}>
      {LABEL[difficulty]}
    </span>
  );
}
