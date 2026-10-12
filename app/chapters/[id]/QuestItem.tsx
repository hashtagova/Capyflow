"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/language-context";
import { getUnitLabels } from "@/lib/unit-labels";
import {
  markQuestComplete,
  markQuestTodo,
  deleteQuest,
  updateQuest,
  addQuest,
} from "@/app/actions/quests";
import {
  addMicroTask,
  toggleMicroTask,
  deleteMicroTask,
} from "@/app/actions/micro-tasks";
import { XP_MAP, PRIORITY_CONFIG } from "@/lib/quest-config";
import type { Difficulty } from "@/lib/quest-config";
import { CelebrationPopup, type CelebrationEvent } from "@/components/celebration-popup";

export interface MicroTask {
  id: string;
  title: string;
  completed: boolean;
  order_index: number;
}

export interface Quest {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  xp_reward: number;
  status: string;
  order_index: number;
  notes: string | null;
  priority: number;
  micro_tasks: MicroTask[];
}

function chapterWonMessage(projectType: string, lang: string): string {
  const unit = getUnitLabels(projectType, lang).singular;
  return `That ${unit} fought back. You won.`;
}

interface Props {
  quest: Quest;
  chapterId: string;
  projectType: string;
  onComplete: (questId: string) => void;
  onUndo: (questId: string) => void;
  onDelete: (questId: string) => void;
  onCelebrate: (message: string) => void;
  onLevelUp: (level: number) => void;
  onUpdate: (questId: string, updates: Partial<Quest>) => void;
  onOptimisticAdd: (quest: Quest) => void;
  onConfirm: (tempId: string, quest: Quest) => void;
  onRollback: (tempId: string) => void;
}


export function QuestItem({ quest, chapterId, projectType, onComplete, onUndo, onDelete, onCelebrate, onLevelUp, onUpdate, onOptimisticAdd, onConfirm, onRollback }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSave] = useTransition();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(quest.title);

  // ── Reopen prompt state machine ──────────────────────────────
  type ReopenState = "idle" | "prompt" | "newquest";
  const [reopenState, setReopenState] = useState<ReopenState>("idle");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState(quest.notes ?? "");
  const [celebrationEvent, setCelebrationEvent] = useState<CelebrationEvent | null>(null);

  // ── Micro-task state ─────────────────────────────────────────
  const [microTasks, setMicroTasks] = useState<MicroTask[]>(quest.micro_tasks);
  const [newMicroTitle, setNewMicroTitle] = useState("");
  const [addingMicro, setAddingMicro] = useState(false);
  const microInputRef = useRef<HTMLInputElement>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { t, lang } = useTranslations();
  const isDone = quest.status === "done";

  const firstUncompleted = (microTasks ?? []).findIndex((mt) => !mt.completed);
  const allMicroDone = (microTasks ?? []).length > 0 && (microTasks ?? []).every((mt) => mt.completed);
  const showZeigarnik = allMicroDone || (microTasks ?? []).length === 0;

  useEffect(() => {
    return () => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); };
  }, []);

  useEffect(() => {
    if (isEditingTitle) titleInputRef.current?.focus();
  }, [isEditingTitle]);

  useEffect(() => {
    if (reopenState === "newquest") quickAddRef.current?.focus();
  }, [reopenState]);

  useEffect(() => {
    if (addingMicro) microInputRef.current?.focus();
  }, [addingMicro]);

  useEffect(() => {
    setNotesDraft(quest.notes ?? "");
  }, [quest.notes]);

  // ── Quest field save helper ──────────────────────────────────
  function saveField(partial: {
    title?: string; difficulty?: Difficulty;
    priority?: number; notes?: string | null;
  }) {
    const merged = {
      title:      quest.title,
      difficulty: quest.difficulty,
      priority:   quest.priority,
      notes:      quest.notes ?? "",
      ...partial,
    };
    startSave(async () => {
      await updateQuest(quest.id, {
        title:      merged.title,
        difficulty: merged.difficulty,
        priority:   merged.priority,
        notes:      merged.notes ?? "",
      });
    });
  }

  // ── Title: single click → expand/collapse; double click → rename ──
  function handleTitleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (isEditingTitle) return;
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      setTitleDraft(quest.title);
      setIsEditingTitle(true);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        if (!isDone) setIsExpanded((prev) => !prev);
      }, 200);
    }
  }

  function commitTitle() {
    const trimmed = titleDraft.trim();
    setIsEditingTitle(false);
    if (!trimmed || trimmed === quest.title) return;
    onUpdate(quest.id, { title: trimmed });
    saveField({ title: trimmed });
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); commitTitle(); }
    if (e.key === "Escape") setIsEditingTitle(false);
  }

  // ── Instant-save field changes ───────────────────────────────
  function handleDifficultyChange(d: Difficulty) {
    onUpdate(quest.id, { difficulty: d, xp_reward: XP_MAP[d] });
    saveField({ difficulty: d });
  }

  function handlePriorityChange(p: number) {
    onUpdate(quest.id, { priority: p });
    saveField({ priority: p });
  }

  function handleNotesBlur() {
    const trimmed = notesDraft.trim();
    if (trimmed === (quest.notes ?? "")) return;
    const newNotes = trimmed || null;
    onUpdate(quest.id, { notes: newNotes });
    saveField({ notes: newNotes });
  }

  // ── Checkbox ─────────────────────────────────────────────────
  function handleToggle(checked: boolean) {
    if (checked) {
      onComplete(quest.id);
      startTransition(async () => {
        const result = await markQuestComplete(quest.id);
        if ("error" in result) {
          onUndo(quest.id);
        } else {
          if (result.wokeUp) {
            onCelebrate("Capy woke up! 🐾 Welcome back!");
          } else if (result.levelUp) {
            onLevelUp(result.levelUp);
          } else if (result.chapterCompleted) {
            setCelebrationEvent({ kind: "milestone", message: chapterWonMessage(projectType, lang) });
          } else if (result.streakMilestone) {
            setCelebrationEvent({ kind: "streak", streak: result.streakMilestone });
          }
          if (result.xpEarned > 0) {
            onCelebrate(`Quest complete! +${result.xpEarned} XP ⭐`);
          } else {
            onCelebrate("Quest complete! ✓");
          }
          result.newAchievements.forEach((a, i) => {
            setTimeout(() => onCelebrate(`🏆 Achievement Unlocked: ${a.title}!`), (i + 1) * 3500);
          });
        }
      });
    } else {
      // Intercept uncheck — show the reopen prompt instead
      setReopenState("prompt");
    }
  }

  function confirmReopen() {
    setReopenState("idle");
    onUndo(quest.id);
    startTransition(async () => {
      const result = await markQuestTodo(quest.id);
      if ("error" in result) onComplete(quest.id);
    });
  }

  function handleQuickAdd() {
    const trimmed = quickAddTitle.trim();
    setReopenState("idle");
    setQuickAddTitle("");
    if (!trimmed) return;
    const tempId = `temp-${Date.now()}`;
    const tempQuest: Quest = {
      id: tempId, title: trimmed, difficulty: "medium", xp_reward: 30,
      status: "todo", order_index: 9999, notes: null, priority: 0, micro_tasks: [],
    };
    onOptimisticAdd(tempQuest);
    startTransition(async () => {
      const result = await addQuest({ chapterId, title: trimmed, difficulty: "medium" });
      if ("quest" in result && result.quest) {
        onConfirm(tempId, { ...result.quest, micro_tasks: [] });
      } else {
        onRollback(tempId);
      }
    });
  }

  function handleQuickAddKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleQuickAdd(); }
    if (e.key === "Escape") { setReopenState("idle"); setQuickAddTitle(""); }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(quest.id);
    startTransition(async () => { await deleteQuest(quest.id); });
  }

  // ── Micro-task handlers ──────────────────────────────────────
  function handleToggleMicro(id: string, completed: boolean) {
    setMicroTasks((prev) => prev.map((mt) => mt.id === id ? { ...mt, completed } : mt));
    startTransition(async () => { await toggleMicroTask(id, completed); });
  }

  function handleAddMicro() {
    const trimmed = newMicroTitle.trim();
    if (!trimmed) { setAddingMicro(false); return; }
    const tempId = `temp-${Date.now()}`;
    const optimistic: MicroTask = {
      id: tempId, title: trimmed, completed: false,
      order_index: (microTasks ?? []).length,
    };
    setMicroTasks((prev) => [...prev, optimistic]);
    setNewMicroTitle("");
    setAddingMicro(false);
    startTransition(async () => {
      const result = await addMicroTask(quest.id, trimmed);
      if ("microTask" in result) {
        setMicroTasks((prev) => prev.map((mt) => mt.id === tempId ? result.microTask : mt).filter((mt): mt is MicroTask => mt !== undefined));
      } else {
        setMicroTasks((prev) => prev.filter((mt) => mt.id !== tempId));
      }
    });
  }

  function handleMicroKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleAddMicro(); }
    if (e.key === "Escape") { setAddingMicro(false); setNewMicroTitle(""); }
  }

  function handleDeleteMicro(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    setMicroTasks((prev) => prev.filter((mt) => mt.id !== id));
    startTransition(async () => { await deleteMicroTask(id); });
  }

  return (
    <>
      <div className={cn("rounded-lg border transition-colors", (isPending || isSaving) && "opacity-60 pointer-events-none")}>

        {/* ── Main row ──────────────────────────────────────── */}
        <div
          className={cn(
            "group flex items-center gap-3 px-3 py-2.5",
            isDone && "bg-muted/30",
            !isDone && !isEditingTitle && "cursor-pointer"
          )}
          onClick={() => { if (!isDone && !isEditingTitle) setIsExpanded((prev) => !prev); }}
        >
          <div onClick={(e) => e.stopPropagation()} className="shrink-0">
            <Checkbox checked={isDone} onCheckedChange={(v) => handleToggle(v === true)} />
          </div>

          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={handleTitleKeyDown}
              onBlur={commitTitle}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-sm bg-transparent border-b border-primary focus:outline-none py-0.5"
            />
          ) : (
            <span
              className={cn(
                "flex-1 text-sm leading-snug select-none",
                isDone ? "line-through text-muted-foreground" : "cursor-pointer"
              )}
              onClick={handleTitleClick}
              title="Double-click to rename"
            >
              {quest.title}
              {quest.notes && <span className="ml-1.5 text-xs not-italic">📝</span>}
            </span>
          )}

          <div className="flex items-center gap-2 shrink-0">
            {quest.priority > 0 && (() => {
              const cfg = PRIORITY_CONFIG[quest.priority as 1 | 2];
              return (
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full border-0", cfg.className)}>
                  {cfg.badge}
                </span>
              );
            })()}
            <DifficultyBadge difficulty={quest.difficulty} />
            <span className="text-xs text-muted-foreground tabular-nums">+{quest.xp_reward} XP</span>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 ml-1 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
            title="Delete quest"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* ── Reopen prompt ────────────────────────────────── */}
        {isDone && reopenState === "prompt" && (
          <div className="border-t px-3 py-2.5 bg-muted/10 space-y-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs font-medium text-foreground">How much work does this need?</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={confirmReopen}
                className="text-xs px-3 py-1.5 rounded-lg border bg-background hover:bg-muted transition-colors">
                Just a few minutes
              </button>
              <button type="button" onClick={() => setReopenState("newquest")}
                className="text-xs px-3 py-1.5 rounded-lg border bg-background hover:bg-muted transition-colors">
                More than 30 minutes
              </button>
              <button type="button" onClick={() => setReopenState("idle")}
                className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {isDone && reopenState === "newquest" && (
          <div className="border-t px-3 py-2.5 bg-muted/10 space-y-2" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-muted-foreground">Sounds like a new quest. What should it be called?</p>
            <div className="flex gap-2">
              <input
                ref={quickAddRef}
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                onKeyDown={handleQuickAddKeyDown}
                placeholder="Name the new quest…"
                className="flex-1 text-xs rounded-md border border-border bg-background px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
              />
              <button type="button" onClick={handleQuickAdd} disabled={!quickAddTitle.trim()}
                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity">
                Add
              </button>
              <button type="button" onClick={() => { setReopenState("idle"); setQuickAddTitle(""); }}
                className="text-xs px-2 py-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors">
                ✕
              </button>
            </div>
          </div>
        )}

        {/* ── Micro-tasks (always visible) ──────────────────── */}
        {!isDone && (
          <div className="border-t px-3 py-2 space-y-1" onClick={(e) => e.stopPropagation()}>
            {(microTasks ?? []).map((mt, idx) => (
              <div key={mt.id} className="group/mt flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={mt.completed}
                  onChange={(e) => handleToggleMicro(mt.id, e.target.checked)}
                  className="shrink-0 h-3.5 w-3.5 rounded accent-primary cursor-pointer"
                />
                <span
                  className={cn(
                    "flex-1 text-xs leading-relaxed",
                    mt.completed
                      ? "line-through text-muted-foreground/60"
                      : idx === firstUncompleted
                      ? "font-medium text-foreground"
                      : "text-foreground"
                  )}
                >
                  {mt.title}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleDeleteMicro(e, mt.id)}
                  className="opacity-0 group-hover/mt:opacity-100 p-0.5 rounded text-muted-foreground/50 hover:text-destructive transition-all shrink-0"
                  title="Remove"
                >
                  <X size={11} />
                </button>
              </div>
            ))}

            {/* Zeigarnik prompt or add link */}
            {addingMicro ? (
              <input
                ref={microInputRef}
                value={newMicroTitle}
                onChange={(e) => setNewMicroTitle(e.target.value)}
                onKeyDown={handleMicroKeyDown}
                onBlur={handleAddMicro}
                placeholder="Describe the small step…"
                className="w-full text-xs bg-transparent border-b border-primary/50 focus:outline-none py-0.5 text-foreground placeholder:text-muted-foreground/50"
              />
            ) : showZeigarnik ? (
              <button
                type="button"
                onClick={() => setAddingMicro(true)}
                className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors italic"
              >
                {t.whatsNextStep}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAddingMicro(true)}
                className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              >
                + add micro-task
              </button>
            )}
          </div>
        )}

        {/* ── Expanded details ──────────────────────────────── */}
        {isExpanded && !isDone && (
          <div className="border-t px-3 py-2.5 bg-muted/10 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-medium w-16 shrink-0">Difficulty</span>
              <select
                value={quest.difficulty}
                onChange={(e) => handleDifficultyChange(e.target.value as Difficulty)}
                className="text-[11px] border rounded-md px-2 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="easy">Easy (+15 XP)</option>
                <option value="medium">Medium (+30 XP)</option>
                <option value="hard">Hard (+50 XP)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-medium w-16 shrink-0">Priority</span>
              <select
                value={quest.priority}
                onChange={(e) => handlePriorityChange(Number(e.target.value))}
                className="text-[11px] border rounded-md px-2 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={0}>Normal</option>
                <option value={1}>High ⚡</option>
                <option value={2}>Urgent 🔥</option>
              </select>
            </div>

            <div className="flex items-start gap-2">
              <span className="text-[11px] text-muted-foreground font-medium w-16 shrink-0 pt-0.5">Notes</span>
              {showNotes || quest.notes ? (
                <div className="flex-1">
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder="Add notes, links, or details..."
                    maxLength={2000}
                    rows={2}
                    className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <p className="text-[10px] text-muted-foreground text-right mt-0.5">{notesDraft.length}/2000</p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNotes(true)}
                  className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2 decoration-dotted transition-colors"
                >
                  Add note
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <CelebrationPopup event={celebrationEvent} onDismiss={() => setCelebrationEvent(null)} />
    </>
  );
}
