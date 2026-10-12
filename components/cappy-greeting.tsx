"use client";

import { useEffect, useState } from "react";
import { type CapyMood, MOOD_IMAGE } from "@/lib/cappy";
import { useTranslations } from "@/lib/language-context";
import { ThesisTitleBadge } from "@/components/thesis-title-badge";
import { DeadlineCard } from "@/components/deadline-card";
import type { Lang } from "@/lib/translations";

const WAKEUP_IMAGE = "/images/capy-wakeup.png";
const WAKEUP_DURATION_MS = 2500;

interface Props {
  mood: CapyMood;
  streak: number;
  hasAnyActivity: boolean;
  deadlineDaysLeft: number | null;
  thesisTitle: string;
  deadline: string | null;
  lang: Lang;
  hasWakeVideo: boolean; // kept for API compatibility, unused
}

export function CapyGreeting({ mood, streak, hasAnyActivity, deadlineDaysLeft, thesisTitle, deadline, lang }: Props) {
  const { t } = useTranslations();
  const [hour, setHour] = useState<number | null>(null);
  const [wakingUp, setWakingUp] = useState(false);
  // ─── DEV ONLY — remove before production ─────────────────────────────────
  type DevOverride = { mood: CapyMood; streak?: number; hasAnyActivity?: boolean; deadlineDaysLeft?: number };
  const MOOD_OVERRIDES: Record<CapyMood, Omit<DevOverride, "mood">> = {
    proud:       { hasAnyActivity: true },
    deadline:    { deadlineDaysLeft: 10, hasAnyActivity: true },
    sleepy:      { hasAnyActivity: true },
    cheerleader: { streak: 9, hasAnyActivity: true },
    rolling:     { streak: 4, hasAnyActivity: true },
    chill:       { streak: 2, hasAnyActivity: true },
    happy:       { streak: 1, hasAnyActivity: true },
  };
  const [devOverride, setDevOverride] = useState<DevOverride | null>(null);
  const [devHour, setDevHour] = useState<number | null>(null);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setHour(new Date().getHours());

    try {
      if (localStorage.getItem("capy_just_woke_up") === "1") {
        localStorage.removeItem("capy_just_woke_up");
        setWakingUp(true);
        setTimeout(() => setWakingUp(false), WAKEUP_DURATION_MS);
      }
    } catch { /* storage unavailable */ }
  }, []);

  const effectiveMood           = devOverride?.mood                          ?? mood;
  const effectiveStreak         = devOverride?.streak                        ?? streak;
  const effectiveHasAnyActivity = devOverride?.hasAnyActivity                ?? hasAnyActivity;
  const effectiveDeadlineDaysLeft: number | null =
    devOverride?.deadlineDaysLeft !== undefined ? devOverride.deadlineDaysLeft : deadlineDaysLeft;

  const isSleepy = effectiveMood === "sleepy";
  const imageSrc = wakingUp ? WAKEUP_IMAGE : MOOD_IMAGE[effectiveMood];

  function timeGreeting(h: number): string {
    if (h >= 6 && h < 12) return t.goodMorning;
    if (h >= 12 && h < 18) return t.goodAfternoon;
    return t.goodEvening;
  }

  function deadlineMessage(): string {
    if (effectiveDeadlineDaysLeft === null) return t.moodDeadlineWeek;
    if (effectiveDeadlineDaysLeft <= 0) return t.moodDeadline;
    if (effectiveDeadlineDaysLeft <= 3) return t.moodDeadlineDays;
    if (effectiveDeadlineDaysLeft <= 7) return t.moodDeadlineWeek;
    return t.moodDeadlineTwoWeeks;
  }

  function moodMessage(): string {
    switch (effectiveMood) {
      case "proud":       return t.moodProud;
      case "deadline":    return deadlineMessage();
      case "cheerleader": return `${t.moodCheerleader} ${effectiveStreak} ${t.days}!`;
      case "happy":       return t.moodHappy;
      case "rolling":     return `${t.moodRolling} ${effectiveStreak} ${t.days}!`;
      case "chill":       return t.moodChill;
      case "sleepy":      return t.moodSleepy;
    }
  }

  const effectiveHour = devHour ?? hour;
  const greeting =
    effectiveHour === null
      ? "Hello!"
      : (devHour !== null || effectiveHasAnyActivity)
      ? timeGreeting(effectiveHour)
      : t.welcomeNew;

  const subtext = !effectiveHasAnyActivity ? t.startStreak : moodMessage();

  return (
    <>
      {/* ─── DEV ONLY — remove before production ─────────────────────────── */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed top-44 left-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52">
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Capy Mood</span>
          {([
            ["proud",       "🏆 proud"],
            ["deadline",    "⏰ deadline / urgent"],
            ["sleepy",      "😴 sleepy (waking up)"],
            ["cheerleader", "📣 cheerleader · streak 9"],
            ["rolling",     "🌊 rolling · streak 4"],
            ["chill",       "😊 chill · streak 2"],
            ["happy",       "✨ happy · streak 1"],
          ] as [CapyMood, string][]).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setDevOverride((prev) => prev?.mood === m ? null : { mood: m, ...MOOD_OVERRIDES[m] })}
              className={`block w-full text-left px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${devOverride?.mood === m ? "bg-orange-400 text-white" : "bg-orange-200 hover:bg-orange-300 text-orange-900"}`}
            >
              {label}
            </button>
          ))}
          {devOverride && (
            <button
              type="button"
              onClick={() => setDevOverride(null)}
              className="block w-full text-left px-2 py-0.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-700 text-[11px] font-medium transition-colors border border-orange-300"
            >
              ↩ reset to real mood
            </button>
          )}
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────── */}

      {/* ─── DEV ONLY — remove before production ─────────────────────────── */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed top-[424px] right-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52">
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Time-of-Day Greeting</span>
          {([
            [ 9, "🌅 Good morning! (6–11)"],
            [14, "☀️ Good afternoon! (12–17)"],
            [20, "🌙 Good evening! (18+/0–5)"],
          ] as [number, string][]).map(([h, label]) => (
            <button
              key={h}
              type="button"
              onClick={() => setDevHour((prev) => prev === h ? null : h)}
              className={`block w-full text-left px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${devHour === h ? "bg-orange-400 text-white" : "bg-orange-200 hover:bg-orange-300 text-orange-900"}`}
            >
              {label}
            </button>
          ))}
          {devHour !== null && (
            <button
              type="button"
              onClick={() => setDevHour(null)}
              className="block w-full text-left px-2 py-0.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-700 text-[11px] font-medium transition-colors border border-orange-300"
            >
              ↩ reset to real time
            </button>
          )}
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────── */}

      {isSleepy && (
        <style>{`
          @keyframes zzz-float {
            0%   { opacity: 0; transform: translateY(0px) scale(0.7); }
            15%  { opacity: 1; }
            75%  { opacity: 0.7; }
            100% { opacity: 0; transform: translateY(-22px) scale(1.1); }
          }
          .zzz-bubble {
            position: absolute;
            animation: zzz-float 2.8s ease-in-out infinite;
            color: var(--muted-foreground, #9ca3af);
            font-weight: 700;
            line-height: 1;
            pointer-events: none;
            select: none;
          }
        `}</style>
      )}

      <div className="flex items-center gap-4">
        {/* Capy image */}
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Capy"
            width={160}
            height={120}
            className="object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
          {isSleepy && !wakingUp && (
            <>
              <span className="zzz-bubble" style={{ left: "55%", top: "22px", fontSize: "12px", animationDelay: "0s" }}>z</span>
              <span className="zzz-bubble" style={{ left: "62%", top: "16px", fontSize: "15px", animationDelay: "0.95s" }}>z</span>
              <span className="zzz-bubble" style={{ left: "68%", top: "10px", fontSize: "19px", animationDelay: "1.9s" }}>Z</span>
            </>
          )}
        </div>

        {/* Text column */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-semibold leading-tight">{greeting}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">{subtext}</p>
            </div>
            <DeadlineCard initialDeadline={deadline} lang={lang} devDaysLeft={devOverride?.deadlineDaysLeft} />
          </div>

          <div className="mt-3">
            <ThesisTitleBadge initialTitle={thesisTitle} />
          </div>
        </div>
      </div>
    </>
  );
}
