"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateDeadline } from "@/app/actions/deadline";
import { useTranslations } from "@/lib/language-context";
import type { Lang } from "@/lib/translations";

interface Props {
  initialDeadline: string | null;
  userCreatedAt?: string | null;
  lang: Lang;
  devDaysLeft?: number; // DEV ONLY — overrides computed days
}

function calcDaysLeft(deadline: string): number {
  // Use Vienna local date as "today" — new Date(dateStr) parses as UTC midnight,
  // so raw timestamp arithmetic can be 1 day off after midnight Vienna / before midnight UTC.
  // Anchoring both dates at noon UTC gives a clean calendar-day count regardless of DST.
  const todayVienna = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Vienna" });
  return Math.ceil(
    (new Date(deadline + "T12:00:00Z").getTime() - new Date(todayVienna + "T12:00:00Z").getTime())
    / (1000 * 60 * 60 * 24)
  );
}

function formatDate(deadline: string, lang: Lang): string {
  const locale = lang === "de" ? "de-DE" : "en-GB";
  return new Date(deadline).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function deadlineColor(days: number): string {
  if (days <= 0)  return "#2D6A4F"; // green — submission day
  if (days <= 7)  return "#C0513A"; // terracotta — urgent
  if (days <= 30) return "#C17F3E"; // amber — getting close
  return "var(--foreground)";       // default — plenty of time
}

export function DeadlineCard({ initialDeadline, lang, devDaysLeft }: Props) {
  const { t } = useTranslations();
  const router = useRouter();
  const [deadline, setDeadline] = useState<string | null>(initialDeadline);
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(initialDeadline ?? "");
  const [isPending, startTransition] = useTransition();
  // ─── DEV ONLY — remove before production ─────────────────────────────────
  const [devDays, setDevDays] = useState<number | null>(null);
  // ─────────────────────────────────────────────────────────────────────────

  function handleSave() {
    if (!inputValue) return;
    const optimisticDeadline = inputValue;
    setDeadline(optimisticDeadline);
    setEditing(false);
    startTransition(async () => {
      const result = await updateDeadline(optimisticDeadline);
      if (result.error) {
        setDeadline(deadline);
      } else {
        router.refresh();
      }
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

  // ─── DEV ONLY — remove before production ─────────────────────────────────
  const devPanel = process.env.NODE_ENV !== "production" ? (
    <div className="fixed top-16 right-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52">
      <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Deadline Colour</span>
      {([
        [60, "🕐 far away (>30 days)"],
        [20, "🟠 within a month (≤30)"],
        [ 4, "🔴 within a week (≤7)"],
        [ 0, "✅ submission day (≤0)"],
      ] as [number, string][]).map(([d, label]) => (
        <button
          key={d}
          type="button"
          onClick={() => setDevDays((prev) => prev === d ? null : d)}
          className={`block w-full text-left px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${devDays === d ? "bg-orange-400 text-white" : "bg-orange-200 hover:bg-orange-300 text-orange-900"}`}
        >
          {label}
        </button>
      ))}
      {devDays !== null && (
        <button
          type="button"
          onClick={() => setDevDays(null)}
          className="block w-full text-left px-2 py-0.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-700 text-[11px] font-medium transition-colors border border-orange-300"
        >
          ↩ reset to real deadline
        </button>
      )}
    </div>
  ) : null;
  // ─────────────────────────────────────────────────────────────────────────

  // ── Edit modal ───────────────────────────────────────────────
  if (editing) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
        onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
      >
        <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-xs space-y-4">
          <h3 className="font-display text-lg font-semibold">{t.theDeadline}</h3>
          <input
            type="date"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || !inputValue}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "…" : t.save}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── No deadline set ──────────────────────────────────────────
  if (!deadline) {
    return (
      <>
        {devPanel}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors text-right leading-snug underline-offset-2 hover:underline"
        >
          {t.noDeadlinePrompt}
        </button>
      </>
    );
  }

  const days  = devDays !== null ? devDays : (devDaysLeft !== undefined ? devDaysLeft : calcDaysLeft(deadline));
  const color = deadlineColor(days);
  const dayWord = days === 1 ? t.dayToSubmission : t.daysToSubmission;

  const editBtn = (
    <button
      onClick={() => { setInputValue(deadline); setEditing(true); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground ml-1.5 align-middle"
      aria-label="Edit deadline"
    >
      ✏️
    </button>
  );

  // ── Submission day ───────────────────────────────────────────
  if (days <= 0) {
    return (
      <>
        {devPanel}
        <div className="group shrink-0">
          <p className="font-display text-lg font-semibold leading-tight" style={{ color }}>
            {t.submissionDay}
            {editBtn}
          </p>
        </div>
      </>
    );
  }

  // ── Countdown ────────────────────────────────────────────────
  return (
    <>
      {devPanel}
      <div className="group shrink-0">
        <p className="font-display text-lg font-bold leading-tight" style={{ color }}>
          {formatDate(deadline, lang)}
          {editBtn}
        </p>
        <p className="text-sm mt-0.5" style={{ color }}>
          {days} {dayWord}
        </p>
      </div>
    </>
  );
}
