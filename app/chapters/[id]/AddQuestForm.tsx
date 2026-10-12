"use client";

import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { addQuest } from "@/app/actions/quests";
import { XP_MAP } from "@/lib/quest-config";
import { useTranslations } from "@/lib/language-context";

type Difficulty = "easy" | "medium" | "hard";
type Priority = 0 | 1 | 2;

export interface NewQuest {
  id: string; title: string; difficulty: Difficulty;
  xp_reward: number; status: string; order_index: number;
  notes: string | null; priority: number;
}

interface Props {
  chapterId: string;
  onOptimisticAdd: (quest: NewQuest) => void;
  onConfirm: (tempId: string, realQuest: NewQuest) => void;
  onRollback: (tempId: string) => void;
}

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy:   "border-emerald-300 bg-emerald-50 text-emerald-700",
  medium: "border-primary/40 bg-accent text-primary",
  hard:   "border-rose-300 bg-rose-50 text-rose-700",
};

const PRIORITY_STYLES: Record<Priority, string> = {
  0: "border-border bg-muted text-foreground",
  1: "border-primary/40 bg-accent text-primary ring-1 ring-primary/30",
  2: "border-rose-300 bg-rose-50 text-rose-700",
};

export function AddQuestForm({ chapterId, onOptimisticAdd, onConfirm, onRollback }: Props) {
  const { t } = useTranslations();
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [priority, setPriority] = useState<Priority>(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const DIFFICULTY_LABELS: Record<Difficulty, string> = {
    easy: t.easy, medium: t.medium, hard: t.hard,
  };
  const PRIORITY_LABELS: Record<Priority, string> = {
    0: t.normal, 1: t.high, 2: t.urgent,
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;
    onOptimisticAdd({
      id: tempId, title: trimmed, difficulty,
      xp_reward: XP_MAP[difficulty], status: "todo",
      order_index: 9999, notes: null, priority,
    });
    setTitle("");
    setError(null);
    inputRef.current?.focus();

    startTransition(async () => {
      const result = await addQuest({ chapterId, title: trimmed, difficulty, priority });
      if ("error" in result) {
        onRollback(tempId);
        setError(result.error ?? "Unknown error");
      } else {
        onConfirm(tempId, result.quest as NewQuest);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder={t.newQuestPlaceholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
          className="flex-1 h-8 text-sm"
        />
        <Button type="submit" size="sm" disabled={!title.trim() || isPending}>
          {isPending ? t.adding : t.addQuest}
        </Button>
      </div>

      <div className="flex gap-1.5">
        {(["easy", "medium", "hard"] as Difficulty[]).map((d) => (
          <button key={d} type="button" onClick={() => setDifficulty(d)}
            className={cn(
              "flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
              difficulty === d ? DIFFICULTY_STYLES[d] : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}>
            {DIFFICULTY_LABELS[d]} · +{XP_MAP[d]} XP
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        {([0, 1, 2] as Priority[]).map((p) => (
          <button key={p} type="button" onClick={() => setPriority(p)}
            className={cn(
              "flex-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors",
              priority === p ? PRIORITY_STYLES[p] : "border-border bg-background text-muted-foreground hover:bg-muted"
            )}>
            {PRIORITY_LABELS[p]}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </form>
  );
}
