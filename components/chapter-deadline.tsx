"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateChapterDeadline } from "@/app/actions/chapters";
import { useTranslations } from "@/lib/language-context";

interface Props {
  chapterId: string;
  initialDeadline: string | null;
}

function formatLongDate(date: string, locale: string): string {
  return new Date(date).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ChapterDeadline({ chapterId, initialDeadline }: Props) {
  const { t, lang } = useTranslations();
  const router = useRouter();
  const [deadline, setDeadline] = useState<string | null>(initialDeadline);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(initialDeadline ?? "");
  const [isPending, startTransition] = useTransition();

  const locale = lang === "de" ? "de-DE" : "en-GB";

  function handleSave() {
    if (!inputValue) return;
    const next = inputValue;
    setDeadline(next);
    setEditing(false);
    startTransition(async () => {
      const result = await updateChapterDeadline(chapterId, next);
      if (result.error) setDeadline(deadline);
      else router.refresh();
    });
  }

  function handleClear() {
    setDeadline(null);
    setInputValue("");
    setEditing(false);
    startTransition(async () => {
      await updateChapterDeadline(chapterId, null);
      router.refresh();
    });
  }

  function handleCancel() {
    setInputValue(deadline ?? "");
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  }

  // ── Edit mode ────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-muted-foreground">📅</span>
        <input
          type="date"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="text-sm border border-border rounded-md px-2 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleSave}
          disabled={isPending || !inputValue}
          className="text-sm font-bold text-[#2D6A4F] hover:opacity-70 disabled:opacity-40 transition-opacity"
          aria-label="Save"
        >
          ✓
        </button>
        {deadline && (
          <button
            onClick={handleClear}
            disabled={isPending}
            className="text-xs text-destructive hover:opacity-70 disabled:opacity-40 transition-opacity"
          >
            {t.clearDeadline}
          </button>
        )}
        <button
          onClick={handleCancel}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Cancel"
        >
          ✗
        </button>
      </div>
    );
  }

  // ── No deadline set ──────────────────────────────────────────
  if (!deadline) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        {t.addDeadline}
      </button>
    );
  }

  // ── Deadline set ─────────────────────────────────────────────
  return (
    <div className="group flex items-center gap-1.5">
      <span className="text-sm text-muted-foreground">
        📅 {t.chapterDeadline}: {formatLongDate(deadline, locale)}
      </span>
      <button
        onClick={() => { setInputValue(deadline); setEditing(true); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground"
        aria-label="Edit deadline"
      >
        ✏️
      </button>
    </div>
  );
}
