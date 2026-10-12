"use client";

import { useState, useEffect } from "react";
import { LinkButton } from "@/components/link-button";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { PRIORITY_CONFIG } from "@/lib/quest-config";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/language-context";
import { DipTooltip } from "@/components/dip-tooltip";

export interface NextQuestItem {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  xp_reward: number;
  chapter_id: string;
  priority: number;
  created_at: string;
  chapter_title: string | null;
}

type SortOption = "urgent_first" | "hardest_first" | "easiest_first" | "oldest_first";

const DIFFICULTY_ORDER: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

function sortQuests(quests: NextQuestItem[], sort: SortOption): NextQuestItem[] {
  return [...quests].sort((a, b) => {
    switch (sort) {
      case "urgent_first":
        if (b.priority !== a.priority) return b.priority - a.priority;
        return DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty];
      case "hardest_first":
        if (DIFFICULTY_ORDER[b.difficulty] !== DIFFICULTY_ORDER[a.difficulty])
          return DIFFICULTY_ORDER[b.difficulty] - DIFFICULTY_ORDER[a.difficulty];
        return b.priority - a.priority;
      case "easiest_first":
        if (DIFFICULTY_ORDER[a.difficulty] !== DIFFICULTY_ORDER[b.difficulty])
          return DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
        return b.priority - a.priority;
      case "oldest_first":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });
}

const LS_KEY = "capyflow_quest_sort";

export function NextQuestCard({ quests }: { quests: NextQuestItem[] }) {
  const { t } = useTranslations();
  const [sort, setSort] = useState<SortOption>("urgent_first");

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "urgent_first",  label: t.urgentFirst },
    { value: "hardest_first", label: t.hardestFirst },
    { value: "easiest_first", label: t.easiestFirst },
    { value: "oldest_first",  label: t.oldestFirst },
  ];

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) as SortOption | null;
    if (saved && ["urgent_first","hardest_first","easiest_first","oldest_first"].includes(saved)) {
      setSort(saved);
    }
  }, []);

  function handleSort(value: SortOption) {
    setSort(value);
    localStorage.setItem(LS_KEY, value);
  }

  const sorted = sortQuests(quests, sort);
  const quest = sorted[0] ?? null;
  const priorityCfg = quest && quest.priority > 0
    ? PRIORITY_CONFIG[quest.priority as 1 | 2]
    : null;

  return (
    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t.yourNextQuest}
          </p>
          <div className="flex gap-1">
            {SORT_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSort(o.value)}
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-md border transition-colors",
                  sort === o.value
                    ? "border-primary bg-accent text-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4">
        {quest ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="font-semibold leading-snug">{quest.title}</p>
              {quest.chapter_title && (
                <p className="text-xs text-muted-foreground">{quest.chapter_title}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                {priorityCfg && (
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", priorityCfg.className)}>
                    {priorityCfg.badge}
                  </span>
                )}
                <DifficultyBadge difficulty={quest.difficulty} />
                <span className="text-xs text-muted-foreground">+{quest.xp_reward} XP</span>
              </div>
            </div>
            <div className="flex gap-2">
              <LinkButton href={`/chapters/${quest.chapter_id}`} size="sm">
                {t.startQuest}
              </LinkButton>
              <DipTooltip>
                <LinkButton href={`/pomodoro?questId=${quest.id}`} variant="outline" size="sm">
                  {t.focus}
                </LinkButton>
              </DipTooltip>
            </div>
          </div>
        ) : (
          <div className="text-center py-4 space-y-2">
            <p className="text-muted-foreground text-sm">{t.noQuestsYet}</p>
            <LinkButton href="/quest-map" variant="outline" size="sm">
              {t.addFirstQuest}
            </LinkButton>
          </div>
        )}
      </div>
    </div>
  );
}
