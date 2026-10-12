"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { addChapter, renameChapter, deleteChapter, reorderChapters } from "@/app/actions/chapters";
import { markProjectDelivered } from "@/app/actions/settings";
import { CelebrationPopup } from "@/components/celebration-popup";
import type { CelebrationEvent } from "@/components/celebration-popup";
import { useTranslations } from "@/lib/language-context";
import type { Lang } from "@/lib/translations";

function formatShortDate(date: string, lang: Lang): string {
  return new Date(date).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

function deadlineChipColor(date: string): string {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000);
  if (days < 0)  return "text-[#C0513A]";
  if (days <= 7) return "text-[#C17F3E]";
  return "text-muted-foreground";
}

export interface ChapterWithCounts {
  id: string;
  title: string;
  status: string;
  progress_pct: number;
  order_index: number;
  total: number;
  done: number;
  deadline: string | null;
}

// ── Sortable chapter card ────────────────────────────────────
interface CardProps {
  chapter: ChapterWithCounts;
  isActive: boolean;
  isEditing: boolean;
  isMenuOpen: boolean;
  editValue: string;
  editInputRef: React.RefObject<HTMLInputElement>;
  statusConfig: Record<string, { label: string; className: string }>;
  lang: Lang;
  onEditChange: (v: string) => void;
  onRenameKeyDown: (e: React.KeyboardEvent, id: string) => void;
  onRenameBlur: (id: string) => void;
  onMenuToggle: (id: string) => void;
  onRenameStart: (id: string, title: string) => void;
  onDeleteStart: (id: string, title: string) => void;
}

function SortableChapterCard({
  chapter, isActive, isEditing, isMenuOpen,
  editValue, editInputRef, statusConfig, lang,
  onEditChange, onRenameKeyDown, onRenameBlur,
  onMenuToggle, onRenameStart, onDeleteStart,
}: CardProps) {
  const { t } = useTranslations();
  const router = useRouter();
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: chapter.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 10 : isMenuOpen ? 50 : undefined,
  };

  useEffect(() => {
    return () => { if (clickTimerRef.current) clearTimeout(clickTimerRef.current); };
  }, []);

  // Single click → navigate (after 200ms so double-click can cancel it)
  // Double click → start inline rename
  function handleTitleClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (isEditing) return;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      onRenameStart(chapter.id, chapter.title);
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickTimerRef.current = null;
        router.push(`/chapters/${chapter.id}`);
      }, 200);
    }
  }

  const badge = statusConfig[chapter.status] ?? statusConfig.not_started;

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch">
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center px-1.5 cursor-grab active:cursor-grabbing text-muted-foreground/30 hover:text-muted-foreground/70 transition-colors touch-none shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </div>

      {/* Chapter card */}
      <Link
        href={`/chapters/${chapter.id}`}
        onClick={(e) => { if (isEditing) e.preventDefault(); }}
        className={cn(
          "group relative flex-1 block rounded-xl border bg-card shadow-sm transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-md",
          isActive && "border-amber-400 ring-1 ring-amber-300/40"
        )}
      >
        {isEditing ? (
          <div className="p-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
            <input
              ref={editInputRef}
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onKeyDown={(e) => onRenameKeyDown(e, chapter.id)}
              onBlur={() => onRenameBlur(chapter.id)}
              className="w-full rounded-lg border border-primary bg-background px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">{t.pressEnterSave}</p>
          </div>
        ) : (
          <div className="p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2 pr-8">
              <div className="flex items-center gap-1.5 min-w-0">
                {isActive && <span title="Capy is here!" className="text-sm shrink-0">🦫</span>}
                <div className="min-w-0">
                  <p
                    className="text-sm font-semibold truncate leading-tight select-none"
                    onClick={handleTitleClick}
                    title="Double-click to rename"
                  >
                    {chapter.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {chapter.done}/{chapter.total} {t.quests}
                  </p>
                </div>
              </div>
              <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0", badge.className)}>
                {badge.label}
              </span>
            </div>
            <Progress value={chapter.progress_pct} className="h-1.5" />
            {chapter.deadline && (
              <p className={cn("text-[11px] mt-1", deadlineChipColor(chapter.deadline))}>
                📅 {formatShortDate(chapter.deadline, lang)}
              </p>
            )}
          </div>
        )}

        {/* Three-dots menu — Delete only */}
        <div
          className="absolute top-2 right-2 z-[20]"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); onMenuToggle(chapter.id); }}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground",
              "transition-all hover:bg-muted hover:text-foreground",
              "opacity-0 group-hover:opacity-100",
              isMenuOpen && "opacity-100 bg-muted"
            )}
          >
            <span className="text-xs font-bold leading-none">···</span>
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-7 z-[50] min-w-[150px] rounded-xl border bg-card shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeleteStart(chapter.id, chapter.title); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
              >
                {t.deleteChapter}
              </button>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

// ── Unit labels per project type ─────────────────────────────
const UNIT_LABELS: Record<string, {
  addBtn: string; addBtnFull: string; placeholder: string;
  noneYet: string; addFirst: string; deleteConfirm: string; allDoneHint: string;
}> = {
  written_thesis: {
    addBtn: "+ Add Chapter",      addBtnFull: "Add chapter",      placeholder: "Chapter name…",
    noneYet: "No chapters yet.",  addFirst: "Add your first chapter below.",
    deleteConfirm: "Delete chapter?", allDoneHint: "All chapters need to be at 100% first.",
  },
  research_paper: {
    addBtn: "+ Add Chapter",      addBtnFull: "Add chapter",      placeholder: "Chapter name…",
    noneYet: "No chapters yet.",  addFirst: "Add your first chapter below.",
    deleteConfirm: "Delete chapter?", allDoneHint: "All chapters need to be at 100% first.",
  },
  mixed: {
    addBtn: "+ Add Chapter",      addBtnFull: "Add chapter",      placeholder: "Chapter name…",
    noneYet: "No chapters yet.",  addFirst: "Add your first chapter below.",
    deleteConfirm: "Delete chapter?", allDoneHint: "All chapters need to be at 100% first.",
  },
  presentation: {
    addBtn: "+ Add Section",      addBtnFull: "Add section",      placeholder: "Section name…",
    noneYet: "No sections yet.",  addFirst: "Add your first section below.",
    deleteConfirm: "Delete section?", allDoneHint: "All sections need to be at 100% first.",
  },
  software: {
    addBtn: "+ Add Milestone",    addBtnFull: "Add milestone",    placeholder: "Milestone name…",
    noneYet: "No milestones yet.", addFirst: "Add your first milestone below.",
    deleteConfirm: "Delete milestone?", allDoneHint: "All milestones need to be at 100% first.",
  },
  design_project: {
    addBtn: "+ Add Stage",        addBtnFull: "Add stage",        placeholder: "Stage name…",
    noneYet: "No stages yet.",    addFirst: "Add your first stage below.",
    deleteConfirm: "Delete stage?", allDoneHint: "All stages need to be at 100% first.",
  },
  creative: {
    addBtn: "+ Add Scene",        addBtnFull: "Add scene",        placeholder: "Scene name…",
    noneYet: "No scenes yet.",    addFirst: "Add your first scene below.",
    deleteConfirm: "Delete scene?", allDoneHint: "All scenes need to be at 100% first.",
  },
};

const DE_UNIT_LABELS: Record<string, {
  addBtn: string; addBtnFull: string; placeholder: string;
  noneYet: string; addFirst: string; deleteConfirm: string; allDoneHint: string;
}> = {
  written_thesis: {
    addBtn: "+ Kapitel hinzufügen", addBtnFull: "Kapitel hinzufügen", placeholder: "Kapitelname…",
    noneYet: "Noch keine Kapitel.", addFirst: "Füge dein erstes Kapitel unten hinzu.",
    deleteConfirm: "Kapitel löschen?", allDoneHint: "Alle Kapitel müssen zuerst 100% erreichen.",
  },
  research_paper: {
    addBtn: "+ Kapitel hinzufügen", addBtnFull: "Kapitel hinzufügen", placeholder: "Kapitelname…",
    noneYet: "Noch keine Kapitel.", addFirst: "Füge dein erstes Kapitel unten hinzu.",
    deleteConfirm: "Kapitel löschen?", allDoneHint: "Alle Kapitel müssen zuerst 100% erreichen.",
  },
  mixed: {
    addBtn: "+ Kapitel hinzufügen", addBtnFull: "Kapitel hinzufügen", placeholder: "Kapitelname…",
    noneYet: "Noch keine Kapitel.", addFirst: "Füge dein erstes Kapitel unten hinzu.",
    deleteConfirm: "Kapitel löschen?", allDoneHint: "Alle Kapitel müssen zuerst 100% erreichen.",
  },
  presentation: {
    addBtn: "+ Abschnitt hinzufügen", addBtnFull: "Abschnitt hinzufügen", placeholder: "Abschnittsname…",
    noneYet: "Noch keine Abschnitte.", addFirst: "Füge deinen ersten Abschnitt unten hinzu.",
    deleteConfirm: "Abschnitt löschen?", allDoneHint: "Alle Abschnitte müssen zuerst 100% erreichen.",
  },
  software: {
    addBtn: "+ Meilenstein hinzufügen", addBtnFull: "Meilenstein hinzufügen", placeholder: "Meilensteinname…",
    noneYet: "Noch keine Meilensteine.", addFirst: "Füge deinen ersten Meilenstein unten hinzu.",
    deleteConfirm: "Meilenstein löschen?", allDoneHint: "Alle Meilensteine müssen zuerst 100% erreichen.",
  },
  design_project: {
    addBtn: "+ Phase hinzufügen", addBtnFull: "Phase hinzufügen", placeholder: "Phasenname…",
    noneYet: "Noch keine Phasen.", addFirst: "Füge deine erste Phase unten hinzu.",
    deleteConfirm: "Phase löschen?", allDoneHint: "Alle Phasen müssen zuerst 100% erreichen.",
  },
  creative: {
    addBtn: "+ Szene hinzufügen", addBtnFull: "Szene hinzufügen", placeholder: "Szenenname…",
    noneYet: "Noch keine Szenen.", addFirst: "Füge deine erste Szene unten hinzu.",
    deleteConfirm: "Szene löschen?", allDoneHint: "Alle Szenen müssen zuerst 100% erreichen.",
  },
};

// ── Main client component ────────────────────────────────────
interface Props {
  initialChapters: ChapterWithCounts[];
  activeChapterId: string | null;
  isDelivered: boolean;
  projectType?: string;
}

export function QuestMapClient({ initialChapters, activeChapterId, isDelivered: initialIsDelivered, projectType = "written_thesis" }: Props) {
  const { t, lang } = useTranslations();
  const unitLabels = (lang === "de" ? DE_UNIT_LABELS : UNIT_LABELS)[projectType] ?? (lang === "de" ? DE_UNIT_LABELS : UNIT_LABELS).written_thesis;
  const [chapters, setChapters] = useState(initialChapters);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [delivered, setDelivered] = useState(initialIsDelivered);
  const [celebrationEvent, setCelebrationEvent] = useState<CelebrationEvent | null>(null);
  // ─── DEV ONLY — remove this state before production ─────────────────────
  const [devForceAllDone, setDevForceAllDone] = useState(false);
  // ─────────────────────────────────────────────────────────────────────────
  const [isDelivering, startDeliverTransition] = useTransition();
  const [, startTransition] = useTransition();
  const celebrationAudioRef = useRef<HTMLAudioElement>(null);

  const allDone = (chapters.length > 0 && chapters.every((c) => c.progress_pct === 100)) || devForceAllDone;

  function playCelebrationAudio() {
    const audio = celebrationAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  function handleDeliver() {
    playCelebrationAudio(); // must be synchronous within the click handler
    startDeliverTransition(async () => {
      const result = await markProjectDelivered();
      if ("success" in result) {
        setDelivered(true);
        setCelebrationEvent({ kind: "delivered" });
      }
    });
  }

  const editInputRef = useRef<HTMLInputElement>(null);
  const addInputRef  = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    not_started: { label: t.notStarted, className: "bg-[#F5F0E8] text-[#7A6055]" },
    in_progress:  { label: t.inProgress, className: "bg-amber-100 text-amber-700" },
    done:         { label: t.done,       className: "bg-emerald-100 text-emerald-700" },
  };

  useEffect(() => { if (editingId) editInputRef.current?.focus(); }, [editingId]);
  useEffect(() => { if (addingNew) addInputRef.current?.focus(); }, [addingNew]);

  function startRename(id: string, currentTitle: string) {
    setMenuOpenId(null);
    setEditingId(id);
    setEditValue(currentTitle);
  }

  function commitRename(id: string) {
    const trimmed = editValue.trim();
    if (!trimmed) { setEditingId(null); return; }
    setChapters((prev) => prev.map((c) => c.id === id ? { ...c, title: trimmed } : c));
    setEditingId(null);
    startTransition(async () => { await renameChapter(id, trimmed); });
  }

  function handleRenameKeyDown(e: React.KeyboardEvent, id: string) {
    if (e.key === "Enter")  { e.preventDefault(); commitRename(id); }
    if (e.key === "Escape") setEditingId(null);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    setChapters((prev) => prev.filter((c) => c.id !== id));
    setDeleteTarget(null);
    startTransition(async () => { await deleteChapter(id); });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = chapters.findIndex((c) => c.id === active.id);
    const newIndex  = chapters.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(chapters, oldIndex, newIndex)
      .map((c, i) => ({ ...c, order_index: i }));
    setChapters(reordered);
    startTransition(async () => { await reorderChapters(reordered.map((c) => c.id)); });
  }

  function handleAddKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); submitAdd(); }
    if (e.key === "Escape") { setAddingNew(false); setNewTitle(""); }
  }

  function submitAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed) { setAddingNew(false); return; }

    const tempId   = `temp-${Date.now()}`;
    const maxOrder = chapters.reduce((m, c) => Math.max(m, c.order_index), -1);
    const optimistic: ChapterWithCounts = {
      id: tempId, title: trimmed, status: "not_started",
      progress_pct: 0, order_index: maxOrder + 1, total: 0, done: 0, deadline: null,
    };
    setChapters((prev) => [...prev, optimistic]);
    setAddingNew(false);
    setNewTitle("");

    startTransition(async () => {
      const result = await addChapter(trimmed);
      if ("chapter" in result) {
        setChapters((prev) =>
          prev.map((c) => c.id === tempId ? { ...result.chapter, total: 0, done: 0, deadline: null } as ChapterWithCounts : c)
        );
      } else {
        setChapters((prev) => prev.filter((c) => c.id !== tempId));
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* ─── DEV ONLY — remove this entire block before production ──────────── */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed top-16 right-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52">
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Quest Map Triggers</span>
          <button type="button" onClick={() => setCelebrationEvent({ kind: "delivered" })} className="block w-full text-left px-2 py-0.5 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 text-[11px] font-medium transition-colors">Show &ldquo;Delivered&rdquo; celebration</button>
          <button type="button" onClick={() => setDevForceAllDone((v) => !v)} className={`block w-full text-left px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${devForceAllDone ? "bg-orange-400 text-white" : "bg-orange-200 hover:bg-orange-300 text-orange-900"}`}>{devForceAllDone ? "✓ Mark as Delivered enabled" : "Enable Mark as Delivered btn"}</button>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {chapters.length === 0 && !addingNew ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground space-y-2 shadow-sm">
          <p className="font-medium">{unitLabels.noneYet}</p>
          <p className="text-sm">{unitLabels.addFirst}</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={chapters.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-2.5">
              {chapters.map((chapter) => (
                <SortableChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  isActive={chapter.id === activeChapterId}
                  isEditing={editingId === chapter.id}
                  isMenuOpen={menuOpenId === chapter.id}
                  editValue={editValue}
                  editInputRef={editInputRef}
                  statusConfig={STATUS_CONFIG}
                  lang={lang}
                  onEditChange={setEditValue}
                  onRenameKeyDown={handleRenameKeyDown}
                  onRenameBlur={commitRename}
                  onMenuToggle={(id) => setMenuOpenId(menuOpenId === id ? null : id)}
                  onRenameStart={startRename}
                  onDeleteStart={(id, title) => { setMenuOpenId(null); setDeleteTarget({ id, title }); }}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Mark as delivered */}
      {delivered ? (
        <div className="flex items-stretch">
          <div className="px-1.5 shrink-0 w-[26px]" />
          <div className="flex-1 rounded-xl border-2 border-emerald-300 bg-emerald-50 py-3 text-center text-sm font-semibold text-emerald-700">
            🎉 Project Delivered!
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-stretch gap-1">
          <div className="flex items-stretch">
            <div className="px-1.5 shrink-0 w-[26px]" />
            <button
              type="button"
              onClick={handleDeliver}
              disabled={!allDone || isDelivering}
              className="flex-1 rounded-xl border-2 border-emerald-400 bg-emerald-50 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              🎉 Mark as Delivered
            </button>
          </div>
          {!allDone && chapters.length > 0 && (
            <div className="flex items-stretch">
              <div className="px-1.5 shrink-0 w-[26px]" />
              <p className="text-xs text-muted-foreground px-1">{unitLabels.allDoneHint}</p>
            </div>
          )}
        </div>
      )}

      {/* Add chapter */}
      <div className="flex items-stretch">
        {/* Spacer matching the drag handle width so the button aligns with chapter cards */}
        <div className="px-1.5 shrink-0 w-[26px]" />
        {addingNew ? (
          <div className="flex-1 rounded-xl border border-dashed border-primary/40 bg-card p-3 space-y-1.5">
            <input
              ref={addInputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleAddKeyDown}
              placeholder={unitLabels.placeholder}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <button type="button" onClick={submitAdd} disabled={!newTitle.trim()}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                {unitLabels.addBtnFull}
              </button>
              <button type="button" onClick={() => { setAddingNew(false); setNewTitle(""); }}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors">
                {t.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setAddingNew(true)}
            className="flex-1 rounded-xl border border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-accent/40 transition-all">
            {unitLabels.addBtn}
          </button>
        )}
      </div>

      {/* Backdrop — closes any open dropdown when clicking outside it */}
      {menuOpenId && (
        <div className="fixed inset-0 z-[15]" onClick={() => setMenuOpenId(null)} />
      )}

      {/* Delete confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="font-display text-lg font-semibold">{unitLabels.deleteConfirm}</h3>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">&ldquo;{deleteTarget.title}&rdquo;</span>{" "}
              {t.deleteConfirmBody}
            </p>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={confirmDelete}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity">
                {t.delete}
              </button>
              <button type="button" onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden audio element for delivery celebration — played synchronously in click handlers */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={celebrationAudioRef} src="/images/cappy-celebration.mp4" preload="auto" style={{ display: "none" }} />

      {/* Delivery celebration overlay */}
      <CelebrationPopup
        event={celebrationEvent}
        onDismiss={() => setCelebrationEvent(null)}
      />
    </div>
  );
}
