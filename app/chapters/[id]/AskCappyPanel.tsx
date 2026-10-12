"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/language-context";
import { CapyQuestSuggestions } from "@/components/capy-quest-suggestions";
import type { QuestSuggestion } from "@/lib/quest-suggestions";

interface Props {
  chapterId: string;
  projectType?: string;
  initialSuggestions?: QuestSuggestion[];
  existingQuestTitles?: Set<string>;
}

export function AskCapyPanel({ chapterId, projectType = "written_thesis", initialSuggestions = [], existingQuestTitles }: Props) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const shuffleRef = useRef<(() => void) | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full rounded-lg py-2 text-sm font-medium transition-all",
          "bg-primary text-primary-foreground hover:opacity-90"
        )}
      >
        {t.askCapy}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-accent/40 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-primary">🦫 {t.capySuggests}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shuffleRef.current?.()}
            className="text-[11px] text-muted-foreground/70 hover:text-muted-foreground transition-colors"
          >
            shuffle
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      </div>
      <CapyQuestSuggestions
        projectType={projectType}
        activeChapterId={chapterId}
        initialSuggestions={initialSuggestions}
        existingQuestTitles={existingQuestTitles}
        shuffleRef={shuffleRef}
        hideHeader
      />
    </div>
  );
}
