"use client";

import { useState, useEffect, useTransition } from "react";
import { addQuest } from "@/app/actions/quests";
import { QUEST_SUGGESTIONS, type QuestSuggestion } from "@/lib/quest-suggestions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface Props {
  projectType: string;
  activeChapterId: string | null;
  initialSuggestions: QuestSuggestion[];
  existingQuestTitles?: Set<string>;
  hideHeader?: boolean;
  shuffleRef?: React.MutableRefObject<(() => void) | null>;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DIFFICULTY_LABEL: Record<string, string> = { easy: "easy", medium: "medium", hard: "hard" };
const DIFFICULTY_COLOR: Record<string, string> = {
  easy:   "text-green-600 bg-green-50 border-green-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  hard:   "text-red-600 bg-red-50 border-red-200",
};

export function CapyQuestSuggestions({ projectType, activeChapterId, initialSuggestions, existingQuestTitles, hideHeader = false, shuffleRef }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Optimistic: titles being added right now (before refresh confirms)
  const [adding, setAdding] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<QuestSuggestion[]>(initialSuggestions);

  // When a quest is deleted externally, remove its title from the optimistic set
  useEffect(() => {
    if (!existingQuestTitles) return;
    setAdding((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const title of Array.from(prev)) {
        if (!existingQuestTitles.has(title)) { next.delete(title); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [existingQuestTitles]);

  function isAdded(title: string) {
    return adding.has(title) || (existingQuestTitles?.has(title) ?? false);
  }

  function handleAdd(s: QuestSuggestion) {
    if (!activeChapterId || isAdded(s.title) || isPending) return;
    startTransition(async () => {
      try {
        setAdding((prev) => new Set(prev).add(s.title));
        const result = await addQuest({ chapterId: activeChapterId, title: s.title, difficulty: s.difficulty });
        if ("error" in result) {
          setAdding((prev) => { const n = new Set(prev); n.delete(s.title); return n; });
        } else {
          router.refresh();
        }
      } catch {
        setAdding((prev) => { const n = new Set(prev); n.delete(s.title); return n; });
      }
    });
  }

  useEffect(() => {
    if (shuffleRef) shuffleRef.current = handleRefresh;
  });

  function handleRefresh() {
    const pool = QUEST_SUGGESTIONS[projectType] ?? QUEST_SUGGESTIONS.written_thesis;
    // Exclude currently shown suggestions
    const current = new Set(suggestions.map((s) => s.title));
    const remaining = pool.filter((s) => !current.has(s.title));
    const next = shuffle(remaining.length >= 3 ? remaining : pool).slice(0, 3);
    setSuggestions(next);
    setAdding(new Set());
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-2">
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">🦫 Capy suggests</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            shuffle
          </button>
        </div>
      )}

      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 transition-opacity",
              isAdded(s.title) && "opacity-50"
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("text-[10px] font-medium border rounded px-1.5 py-0.5 shrink-0", DIFFICULTY_COLOR[s.difficulty])}>
                {DIFFICULTY_LABEL[s.difficulty]}
              </span>
              <span className="text-sm truncate">{s.title}</span>
            </div>
            {activeChapterId ? (
              <button
                type="button"
                onClick={() => handleAdd(s)}
                disabled={isPending || isAdded(s.title)}
                className="text-xs font-medium text-primary shrink-0 hover:underline disabled:opacity-40 transition-opacity"
              >
                {isAdded(s.title) ? "added" : "+ add"}
              </button>
            ) : (
              <span className="text-[10px] text-muted-foreground/50 shrink-0">add a chapter first</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
