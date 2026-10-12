"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { QuestItem, type Quest, type MicroTask } from "./QuestItem";
import { AddQuestForm, type NewQuest } from "./AddQuestForm";
import { AskCapyPanel } from "./AskCappyPanel";
import type { QuestSuggestion } from "@/lib/quest-suggestions";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/language-context";
import { getUnitLabels } from "@/lib/unit-labels";
import { CelebrationPopup, type CelebrationEvent } from "@/components/celebration-popup";

function calcProgress(quests: Quest[]): { pct: number; status: string } {
  const total = quests.length;
  const done = quests.filter((q) => q.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const status = pct === 100 ? "done" : pct > 0 ? "in_progress" : "not_started";
  return { pct, status };
}

interface Props {
  chapterId: string;
  initialQuests: Quest[];
  initialProgressPct: number;
  initialStatus: string;
  projectType?: string;
  initialSuggestions?: QuestSuggestion[];
}

export function QuestList({ chapterId, initialQuests, initialProgressPct, initialStatus, projectType = "written_thesis", initialSuggestions = [] }: Props) {
  const { t, lang } = useTranslations();

  const STATUS_BADGE: Record<string, { label: string; className: string }> = {
    not_started: { label: t.notStarted, className: "bg-[#F5F0E8] text-[#7A6055]" },
    in_progress:  { label: t.inProgress, className: "bg-amber-100 text-amber-700" },
    done:         { label: t.done,       className: "bg-emerald-100 text-emerald-700" },
  };

  const [quests, setQuests] = useState<Quest[]>(initialQuests);
  const [progressPct, setProgressPct] = useState(initialProgressPct);
  const [chapterStatus, setChapterStatus] = useState(initialStatus);

  // Sync when server refreshes data (e.g. after suggestion add)
  useEffect(() => {
    setQuests(initialQuests);
  }, [initialQuests]);
  useEffect(() => {
    setProgressPct(initialProgressPct);
    setChapterStatus(initialStatus);
  }, [initialProgressPct, initialStatus]);
  const [celebrationEvent, setCelebrationEvent] = useState<CelebrationEvent | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastFading, setToastFading] = useState(false);

  // Collapsible completed section — persisted per chapter
  const LS_KEY = `chapter_${chapterId}_done_open`;
  const [completedOpen, setCompletedOpen] = useState(false);
  useEffect(() => {
    if (localStorage.getItem(LS_KEY) === "true") setCompletedOpen(true);
  }, [LS_KEY]);
  function toggleCompleted() {
    setCompletedOpen((prev) => {
      localStorage.setItem(LS_KEY, String(!prev));
      return !prev;
    });
  }

  const unit = getUnitLabels(projectType, lang).singular;

  function syncProgress(updated: Quest[]) {
    const { pct, status } = calcProgress(updated);
    setProgressPct(pct);
    setChapterStatus(status);
    // Chapter milestone is driven solely by result.chapterCompleted from the
    // server action (gated on milestone_celebrated_at in the database).
    // Removed client-side trigger to prevent repeat celebrations on re-completion.
  }

  function showToast(msg: string) {
    setToast(msg);
    setToastFading(false);
    setTimeout(() => setToastFading(true), 2500);
    setTimeout(() => { setToast(null); setToastFading(false); }, 3000);
  }

  function handleLevelUp(level: number) {
    setTimeout(() => setCelebrationEvent({ kind: "level-up", level }), 1000);
  }

  function handleOptimisticAdd(quest: NewQuest) {
    const full: Quest = { ...quest, micro_tasks: [] as MicroTask[] };
    setQuests((prev) => { const u = [...prev, full]; syncProgress(u); return u; });
  }
  function handleConfirm(tempId: string, realQuest: NewQuest) {
    const full: Quest = { ...realQuest, micro_tasks: [] as MicroTask[] };
    setQuests((prev) => prev.map((q) => q.id === tempId ? full : q));
  }
  function handleRollback(tempId: string) {
    setQuests((prev) => { const u = prev.filter((q) => q.id !== tempId); syncProgress(u); return u; });
  }
  function handleComplete(questId: string) {
    setQuests((prev) => { const u = prev.map((q) => q.id === questId ? { ...q, status: "done" } : q); syncProgress(u); return u; });
  }
  function handleUndo(questId: string) {
    setQuests((prev) => { const u = prev.map((q) => q.id === questId ? { ...q, status: "todo" } : q); syncProgress(u); return u; });
  }
  function handleDelete(questId: string) {
    setQuests((prev) => { const u = prev.filter((q) => q.id !== questId); syncProgress(u); return u; });
  }
  function handleUpdate(questId: string, updates: Partial<Quest>) {
    setQuests((prev) => { const u = prev.map((q) => q.id === questId ? { ...q, ...updates } : q); syncProgress(u); return u; });
  }

  const todo = quests
    .filter((q) => q.status !== "done")
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.order_index - b.order_index);
  const done = quests.filter((q) => q.status === "done");
  const badge = STATUS_BADGE[chapterStatus] ?? STATUS_BADGE.not_started;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{done.length}/{quests.length} {t.questsComplete}</span>
              <span>·</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2 w-48" />
          </div>
          <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full shrink-0", badge.className)}>
            {badge.label}
          </span>
        </div>
      </div>

      <Separator />

      {/* ─── DEV ONLY — remove this entire block before production ──────────── */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed top-16 right-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52">
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Quest / Chapter Triggers</span>
          {([
            ["XP toast (+30 XP)", () => showToast("Quest complete! +30 XP ⭐")],
            ["Level-up (Lv 3)", () => setCelebrationEvent({ kind: "level-up", level: 3 })],
            ["Chapter 100% milestone", () => setCelebrationEvent({ kind: "milestone", message: `That ${unit} fought back. You won.` })],
            ["Achievement: Gentle Return", () => setCelebrationEvent({ kind: "achievement", icon: "🦫", title: "Gentle Return", desc: "Back after 3+ days. Capy saved your spot." })],
            ["Achievement: First Step", () => setCelebrationEvent({ kind: "achievement", icon: "⭐", title: "First Step", desc: "Complete your first quest. Every dive starts somewhere." })],
          ] as [string, () => void][]).map(([label, fn]) => (
            <button key={label} type="button" onClick={fn} className="block w-full text-left px-2 py-0.5 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 text-[11px] font-medium transition-colors">{label}</button>
          ))}
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────────── */}

      <AddQuestForm chapterId={chapterId} onOptimisticAdd={handleOptimisticAdd} onConfirm={handleConfirm} onRollback={handleRollback} />

      <AskCapyPanel
        chapterId={chapterId}
        projectType={projectType}
        initialSuggestions={initialSuggestions}
        existingQuestTitles={new Set(quests.map((q) => q.title))}
      />

      <Link
        href={`/pomodoro?chapterId=${chapterId}`}
        className="flex items-center justify-center gap-2 w-full rounded-lg px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        💧 Start Dip
      </Link>

      <Separator />

      {quests.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">{t.noQuestsInChapter}</p>
      ) : (
        <div className="space-y-3">
          {todo.length > 0 && (
            <div className="space-y-1.5">
              {todo.map((quest) => (
                <QuestItem key={quest.id} quest={quest}
                  chapterId={chapterId}
                  projectType={projectType}
                  onComplete={handleComplete} onUndo={handleUndo} onDelete={handleDelete}
                  onCelebrate={showToast} onLevelUp={handleLevelUp} onUpdate={handleUpdate}
                  onOptimisticAdd={handleOptimisticAdd} onConfirm={handleConfirm} onRollback={handleRollback} />
              ))}
            </div>
          )}

          {done.length > 0 && (
            <div className="space-y-1.5">
              {/* Collapsible header */}
              <button
                type="button"
                onClick={toggleCompleted}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1 hover:text-foreground transition-colors"
              >
                <span>{done.length} {t.completed}</span>
                <span className="text-[10px]">{completedOpen ? "▴" : "▾"}</span>
              </button>

              {completedOpen && (
                <div className="space-y-1.5">
                  {done.map((quest) => (
                    <QuestItem key={quest.id} quest={quest}
                      chapterId={chapterId}
                      projectType={projectType}
                      onComplete={handleComplete} onUndo={handleUndo} onDelete={handleDelete}
                      onCelebrate={showToast} onLevelUp={handleLevelUp} onUpdate={handleUpdate}
                      onOptimisticAdd={handleOptimisticAdd} onConfirm={handleConfirm} onRollback={handleRollback} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="bg-foreground text-background px-5 py-3 rounded-full shadow-xl text-sm font-medium whitespace-nowrap"
            style={toastFading
              ? { opacity: 0, transform: "translateY(12px)", transition: "opacity 0.5s ease, transform 0.5s ease" }
              : { animation: "toast-slide-up 0.3s ease forwards" }}>
            {toast}
          </div>
        </div>
      )}

      <CelebrationPopup event={celebrationEvent} onDismiss={() => setCelebrationEvent(null)} />

    </div>
  );
}
