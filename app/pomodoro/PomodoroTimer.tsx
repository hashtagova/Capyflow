"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { savePomodoroSession } from "@/app/actions/pomodoro";
import { CelebrationPopup, type CelebrationEvent } from "@/components/celebration-popup";
import { CliffhangerPrompt } from "@/components/cliffhanger-prompt";
import { useTranslations } from "@/lib/language-context";
import { getAchievementText } from "@/lib/achievements";
import { AmbientPlayer } from "./AmbientPlayer";

// ── Types ────────────────────────────────────────────────────
type Phase = "idle" | "running" | "paused" | "cliffhanger" | "celebrating" | "break" | "finished";

interface ActiveQuest {
  id: string;
  title: string;
  chapter_id: string | null;
  chapter_title: string;
}

interface Props {
  defaultDuration: number;
  activeQuests: ActiveQuest[];
  initialQuestId?: string;
  userId: string;
  measurementUnit?: string;
  projectType?: string;
}

// ── Helpers ──────────────────────────────────────────────────
function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const PRESET_DURATIONS = [25, 45, 60] as const;

const BREAK_MESSAGES = {
  en: [
    "Step away from the screen. It'll still be there. 🌿",
    "One TikTok. Just one. We both know how this ends. 📱",
    "This is the break. Not later. Now. ☕",
    "Go look at something that isn't a document. 👀",
    "Sit weird. Stretch strange. You know what to do. 🦫",
    "Drink water. Capy insists. 💧",
    "Nothing is due in the next five minutes. Nothing. 🫧",
    "You're allowed to just exist for a moment. 🌀",
    "Capy stepped out too. Back in five. 🦫",
    "The work is paused. You can be paused too. ✨",
  ],
  de: [
    "Geh vom Bildschirm weg. Er ist gleich noch da. 🌿",
    "Ein TikTok. Nur eins. Wir wissen beide, wie das endet. 📱",
    "Das ist die Pause. Nicht später. Jetzt. ☕",
    "Schau dir was an, das kein Dokument ist. 👀",
    "Sitz komisch. Streck dich seltsam. Du weißt schon. 🦫",
    "Trink Wasser. Capy besteht darauf. 💧",
    "In den nächsten fünf Minuten ist nichts fällig. Nichts. 🫧",
    "Du darfst einfach mal kurz sein. 🌀",
    "Capy macht auch Pause. In fünf Minuten zurück. 🦫",
    "Die Arbeit pausiert. Du darfst das auch. ✨",
  ],
} as const;

const QUOTES_BY_TYPE: Record<string, readonly string[]> = {
  written_thesis: [
    "One paragraph at a time.",
    "The thesis writes itself, sentence by sentence.",
    "You showed up. That already counts.",
    "Progress, not perfection.",
    "Small steps are still steps.",
    "It doesn't have to be perfect today.",
    "Capy is chilling. You're doing great.",
    "Every session brings you closer to done.",
    "Just this one session. That's enough.",
    "Capy believes in you. No pressure.",
  ],
  research_paper: [
    "One argument at a time.",
    "The paper is taking shape, word by word.",
    "You showed up. That already counts.",
    "Progress, not perfection.",
    "Small steps are still steps.",
    "It doesn't have to be perfect today.",
    "Capy is chilling. You're doing great.",
    "Every session brings you closer to done.",
    "Just this one session. That's enough.",
    "Capy believes in you. No pressure.",
  ],
  software: [
    "One commit at a time.",
    "The code is getting written, function by function.",
    "You showed up. That already counts.",
    "Progress, not perfection.",
    "Small steps are still steps.",
    "It doesn't have to be perfect today.",
    "Capy is chilling. You're doing great.",
    "One session closer to shipped.",
    "Just this one session. That's enough.",
    "Capy believes in you. No pressure.",
  ],
  presentation: [
    "One slide at a time.",
    "The deck is coming together, idea by idea.",
    "You showed up. That already counts.",
    "Progress, not perfection.",
    "Small steps are still steps.",
    "It doesn't have to be perfect today.",
    "Capy is chilling. You're doing great.",
    "Every session brings you closer to ready.",
    "Just this one session. That's enough.",
    "Capy believes in you. No pressure.",
  ],
  design_project: [
    "One draft at a time.",
    "The design is evolving, iteration by iteration.",
    "You showed up. That already counts.",
    "Progress, not perfection.",
    "Small steps are still steps.",
    "It doesn't have to be perfect today.",
    "Capy is chilling. You're doing great.",
    "Every session brings you closer to done.",
    "Just this one session. That's enough.",
    "Capy believes in you. No pressure.",
  ],
  creative: [
    "One scene at a time.",
    "The story is being told, word by word.",
    "You showed up. That already counts.",
    "Progress, not perfection.",
    "Small steps are still steps.",
    "It doesn't have to be perfect today.",
    "Capy is chilling. You're doing great.",
    "Every session brings you closer to the end.",
    "Just this one session. That's enough.",
    "Capy believes in you. No pressure.",
  ],
  mixed: [
    "One step at a time.",
    "The project is moving forward, piece by piece.",
    "You showed up. That already counts.",
    "Progress, not perfection.",
    "Small steps are still steps.",
    "It doesn't have to be perfect today.",
    "Capy is chilling. You're doing great.",
    "Every session brings you closer to done.",
    "Just this one session. That's enough.",
    "Capy believes in you. No pressure.",
  ],
};

const QUOTES_DEFAULT = QUOTES_BY_TYPE.written_thesis;

function getQuotes(projectType?: string): readonly string[] {
  return (projectType ? QUOTES_BY_TYPE[projectType] : undefined) ?? QUOTES_DEFAULT;
}

function breakDuration(mins: number) {
  return mins >= 50 ? 10 * 60_000 : 5 * 60_000;
}

// ── Timer ring ───────────────────────────────────────────────
function TimerRing({
  remainingMs,
  totalMs,
  phase,
  children,
}: {
  remainingMs: number;
  totalMs: number;
  phase: Phase;
  children: React.ReactNode;
}) {
  const size = 260;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = totalMs > 0 ? Math.max(0, remainingMs / totalMs) : 0;
  const dashOffset = circumference * (1 - progress);

  const ringColor =
    phase === "break"
      ? "#60a5fa"
      : phase === "celebrating"
      ? "#5B8A5E"
      : "#C17F3E";

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8DDD4"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-none"
        />
      </svg>
      <div className="absolute flex flex-col items-center gap-1">{children}</div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export function PomodoroTimer({ defaultDuration, activeQuests, initialQuestId, userId, measurementUnit = "words", projectType }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lang } = useTranslations();

  const isPreset = (PRESET_DURATIONS as readonly number[]).includes(defaultDuration);
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration);
  const [isCustom, setIsCustom] = useState(!isPreset);
  const [customInput, setCustomInput] = useState(isPreset ? "" : String(defaultDuration));

  const [phase, setPhase] = useState<Phase>("idle");
  const [sessionMs, setSessionMs] = useState(defaultDuration * 60_000);
  const [remainingMs, setRemainingMs] = useState(defaultDuration * 60_000);
  const breakMs = breakDuration(selectedDuration);
  const [breakRemainingMs, setBreakRemainingMs] = useState(breakMs);

  const chapterIdParam = searchParams.get("chapterId");
  const chapterQuestId = chapterIdParam
    ? activeQuests.find((q) => q.chapter_id === chapterIdParam)?.id
    : undefined;
  const validInitialQuestId =
    (initialQuestId && activeQuests.some((q) => q.id === initialQuestId) ? initialQuestId : undefined) ??
    chapterQuestId ??
    "free";
  const [selectedQuestId, setSelectedQuestId] = useState(validInitialQuestId);
  const [xpEarned, setXpEarned] = useState<number | null>(null);
  const [achievementToast, setAchievementToast] = useState<string | null>(null);
  const [achievementFading, setAchievementFading] = useState(false);

  // ─── DEV ONLY — remove this state before production ─────────────────────
  const [devXpVisible, setDevXpVisible] = useState(false);
  // ─────────────────────────────────────────────────────────────────────────

  const endTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const cliffhangerWordCountRef = useRef<number | undefined>(undefined);
  const cliffhangerSlideCountRef = useRef<number | undefined>(undefined);
  const dipSyncMountedRef = useRef(false); // skip sync on first render so restore can read first

  // Used to trigger startMainCountdown from a separate effect after restore commits
  const [pendingRestoreMs, setPendingRestoreMs] = useState<number | null>(null);

  // PiP refs + open state
  const pipWindowRef = useRef<Window | null>(null);
  const pipTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pipOpen, setPipOpen] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  useEffect(() => { setPipSupported("documentPictureInPicture" in window); }, []);

  function playEndChime() {
    try {
      const ctx = new AudioContext();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = ctx.currentTime + i * 0.18;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.22, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
        osc.start(start);
        osc.stop(start + 0.9);
      });
      setTimeout(() => ctx.close(), 2500);
    } catch { /* ignore if AudioContext unavailable */ }
  }

  const [celebrationEvent, setCelebrationEvent] = useState<CelebrationEvent | null>(null);
  const achievementQueueRef = useRef<{ icon: string; title: string; desc: string }[]>([]);

  const [, startSave] = useTransition();

  const quotes = getQuotes(projectType);
  const [quoteIdx, setQuoteIdx] = useState(() => Math.floor(Math.random() * quotes.length));
  const [quoteVisible, setQuoteVisible] = useState(true);
  const [breakMessage] = useState(() => { const msgs = BREAK_MESSAGES[lang]; return msgs[Math.floor(Math.random() * msgs.length)]; });

  useEffect(() => {
    if (phase !== "running") return;
    setQuoteIdx(Math.floor(Math.random() * quotes.length));
    setQuoteVisible(true);
    const interval = setInterval(() => {
      setQuoteVisible(false);
      setTimeout(() => {
        setQuoteIdx((i) => {
          let next: number;
          do { next = Math.floor(Math.random() * quotes.length); } while (next === i);
          return next;
        });
        setQuoteVisible(true);
      }, 400);
    }, 60_000);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => () => clearTimer(), []);

  // Update browser tab title so the timer is visible from other browser tabs
  useEffect(() => {
    const originalTitle = document.title;
    return () => { document.title = originalTitle; };
  }, []);

  useEffect(() => {
    if (phase === "running") {
      document.title = `${formatTime(remainingMs)} 💧 Dip`;
    } else if (phase === "paused") {
      document.title = `⏸ ${formatTime(remainingMs)} — Paused`;
    } else if (phase === "break") {
      document.title = `${formatTime(breakRemainingMs)} ☕ Break`;
    } else {
      document.title = "Capyflow";
    }
  }, [phase, remainingMs, breakRemainingMs]);

  // Start countdown when restore sets pendingRestoreMs (deferred to avoid interval being
  // cleared by React's cleanup-before-remount cycle during development strict mode)
  useEffect(() => {
    if (pendingRestoreMs === null) return;
    startMainCountdown(pendingRestoreMs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRestoreMs]);

  // Sync active dip state to localStorage so the floating widget and restore-on-return work
  const DIP_LS_KEY = "capyflow_active_dip";
  useEffect(() => {
    // Skip first run (phase="idle") so the restore effect below can read saved data first
    if (!dipSyncMountedRef.current) { dipSyncMountedRef.current = true; return; }
    try {
      if (phase === "running") {
        const quest = activeQuests.find((q) => q.id === selectedQuestId);
        localStorage.setItem(DIP_LS_KEY, JSON.stringify({
          endsAt: endTimeRef.current,
          phase: "running",
          questTitle: quest?.title ?? null,
          questId: selectedQuestId !== "free" ? selectedQuestId : null,
          sessionMs,
          startedAt: startedAtRef.current?.toISOString() ?? null,
        }));
      } else if (phase === "paused") {
        const quest = activeQuests.find((q) => q.id === selectedQuestId);
        localStorage.setItem(DIP_LS_KEY, JSON.stringify({
          endsAt: null,
          remainingMs: Math.max(0, endTimeRef.current - Date.now()),
          phase: "paused",
          questTitle: quest?.title ?? null,
          questId: selectedQuestId !== "free" ? selectedQuestId : null,
          sessionMs,
          startedAt: startedAtRef.current?.toISOString() ?? null,
        }));
      } else if (phase === "break") {
        localStorage.setItem(DIP_LS_KEY, JSON.stringify({
          endsAt: endTimeRef.current,
          phase: "break",
          questTitle: null,
          sessionMs,
          startedAt: startedAtRef.current?.toISOString() ?? null,
        }));
      } else {
        localStorage.removeItem(DIP_LS_KEY);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Restore timer state when navigating back to this page
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DIP_LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        endsAt: number | null;
        remainingMs?: number;
        phase: "running" | "paused" | "break";
        questId?: string | null;
        sessionMs?: number;
        startedAt?: string | null;
      };

      if (saved.questId && activeQuests.some((q) => q.id === saved.questId)) {
        setSelectedQuestId(saved.questId);
      }
      if (saved.sessionMs) setSessionMs(saved.sessionMs);
      if (saved.startedAt) startedAtRef.current = new Date(saved.startedAt);

      if (saved.phase === "running" && saved.endsAt) {
        const remaining = saved.endsAt - Date.now();
        if (remaining > 0) {
          setRemainingMs(remaining);
          setPendingRestoreMs(remaining);
        } else {
          localStorage.removeItem(DIP_LS_KEY);
        }
      } else if (saved.phase === "paused" && saved.remainingMs) {
        // Auto-resume: returning to the page resumes the timer
        setRemainingMs(saved.remainingMs);
        setPendingRestoreMs(saved.remainingMs);
      } else if (saved.phase === "break" && saved.endsAt) {
        const remaining = saved.endsAt - Date.now();
        if (remaining > 0) {
          setBreakRemainingMs(remaining);
          startBreakCountdown(remaining);
        } else {
          localStorage.removeItem(DIP_LS_KEY);
          setPhase("finished");
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  useEffect(() => {
    if (phase !== "celebrating") return;

    // Generate a stable UUID for this session on first entry to "celebrating".
    // Retried saves with the same ID are idempotent (ON CONFLICT DO NOTHING).
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
    }

    startSave(async () => {
      const result = await savePomodoroSession({
        sessionId: sessionIdRef.current!,
        questId: selectedQuestId !== "free" ? selectedQuestId : null,
        durationMinutes: Math.round(sessionMs / 60_000),
        startedAt: (startedAtRef.current ?? new Date()).toISOString(),
        wordCount: cliffhangerWordCountRef.current,
        slideCount: cliffhangerSlideCountRef.current,
      });
      if ("xpEarned" in result) setXpEarned(result.xpEarned ?? null);
      if ("wokeUp" in result && result.wokeUp) {
        try { localStorage.setItem("capy_just_woke_up", "1"); } catch { /* quota */ }
        setAchievementToast("Capy woke up! 🐾 Welcome back!");
        setAchievementFading(false);
        setTimeout(() => setAchievementFading(true), 3500);
        setTimeout(() => { setAchievementToast(null); setAchievementFading(false); }, 4000);
      } else if ("streakMilestone" in result && result.streakMilestone) {
        setCelebrationEvent({ kind: "streak", streak: result.streakMilestone });
      }
      if ("newAchievements" in result && result.newAchievements && result.newAchievements.length > 0) {
        const items = result.newAchievements.map((a) => {
          const text = getAchievementText(a, projectType, lang);
          return { icon: a.icon, title: text.title, desc: text.desc };
        });
        achievementQueueRef.current = items.slice(1);
        setCelebrationEvent({ kind: "achievement", ...items[0] });
      }
    });

    const t = setTimeout(() => {
      setBreakRemainingMs(breakMs);
      setPhase("break");
      startBreakCountdown(breakMs);
    }, 2500);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startMainCountdown(fromMs: number) {
    clearTimer();
    endTimeRef.current = Date.now() + fromMs;
    startedAtRef.current = startedAtRef.current ?? new Date();
    setPhase("running");
    intervalRef.current = setInterval(() => {
      const left = endTimeRef.current - Date.now();
      if (left <= 0) {
        clearTimer();
        setRemainingMs(0);
        playEndChime();
        setPhase("cliffhanger");
      } else {
        setRemainingMs(left);
      }
    }, 250);
  }

  function startBreakCountdown(ms: number) {
    clearTimer();
    endTimeRef.current = Date.now() + ms;
    intervalRef.current = setInterval(() => {
      const left = endTimeRef.current - Date.now();
      if (left <= 0) {
        clearTimer();
        setBreakRemainingMs(0);
        playEndChime();
        setPhase("finished");
      } else {
        setBreakRemainingMs(left);
      }
    }, 250);
  }

  function closePip() {
    if (pipTickRef.current) { clearInterval(pipTickRef.current); pipTickRef.current = null; }
    if (pipWindowRef.current && !pipWindowRef.current.closed) pipWindowRef.current.close();
    pipWindowRef.current = null;
    setPipOpen(false);
  }

  async function openPip() {
    if (!("documentPictureInPicture" in window)) return;
    if (pipWindowRef.current && !pipWindowRef.current.closed) { closePip(); return; }
    setPipOpen(true);
    try {
      // @ts-expect-error – documentPictureInPicture not yet in TS lib
      const pip: Window = await window.documentPictureInPicture.requestWindow({ width: 280, height: 160 });
      pipWindowRef.current = pip;

      const body = pip.document.body;
      body.style.cssText = "margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;user-select:none;";

      const wrap = pip.document.createElement("div");
      wrap.style.cssText = "width:100%;height:100%;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;";

      const closeBtn = pip.document.createElement("button");
      closeBtn.textContent = "✕";
      closeBtn.style.cssText = "position:absolute;top:8px;right:10px;background:none;border:none;cursor:pointer;font-size:14px;opacity:0.45;line-height:1;padding:2px 4px;border-radius:4px;";
      closeBtn.onmouseenter = () => { closeBtn.style.opacity = "0.9"; };
      closeBtn.onmouseleave = () => { closeBtn.style.opacity = "0.45"; };
      closeBtn.onclick = () => closePip();

      const emojiEl = pip.document.createElement("div");
      emojiEl.style.cssText = "font-size:28px;line-height:1;";
      const labelEl = pip.document.createElement("div");
      labelEl.style.cssText = "font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;opacity:0.7;";
      const timeEl = pip.document.createElement("div");
      timeEl.style.cssText = "font-size:40px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1;letter-spacing:-1px;";
      const questEl = pip.document.createElement("div");
      questEl.style.cssText = "font-size:10px;opacity:0.6;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;";

      wrap.append(closeBtn, emojiEl, labelEl, timeEl, questEl);
      body.appendChild(wrap);

      const LS_KEY = "capyflow_active_dip";
      const update = () => {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (!raw) return;
          const d = JSON.parse(raw) as { phase: string; endsAt?: number | null; remainingMs?: number; questTitle?: string | null };
          const isBreak = d.phase === "break";
          const isPaused = d.phase === "paused";
          let ms = 0;
          if (isPaused) ms = d.remainingMs ?? 0;
          else if (d.endsAt) ms = Math.max(0, d.endsAt - Date.now());
          const bg = isBreak ? "#1e3a5f" : isPaused ? "#3d2e28" : "#5C3317";
          const fg = isBreak ? "#93c5fd" : isPaused ? "#c9a98e" : "#F5DEB3";
          wrap.style.background = bg;
          emojiEl.style.color = fg; labelEl.style.color = fg; timeEl.style.color = fg; questEl.style.color = fg; closeBtn.style.color = fg;
          emojiEl.textContent = isBreak ? "☕" : isPaused ? "⏸️" : "💧";
          labelEl.textContent = isBreak ? "Break" : isPaused ? "Paused" : "Dip";
          timeEl.textContent = formatTime(ms);
          questEl.textContent = d.questTitle ?? "";
        } catch { /* ignore */ }
      }
      update();
      pipTickRef.current = setInterval(update, 500);
      pip.addEventListener("unload", () => {
        if (pipTickRef.current) { clearInterval(pipTickRef.current); pipTickRef.current = null; }
        pipWindowRef.current = null;
        setPipOpen(false);
      });
    } catch { /* blocked or not supported */ }
  }

  // Auto-close PiP when user returns to the Dips tab
  useEffect(() => {
    function onVisibility() { if (!document.hidden) closePip(); }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-close PiP when session ends
  useEffect(() => {
    if (phase === "idle" || phase === "cliffhanger" || phase === "celebrating" || phase === "finished") {
      closePip();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function handleStart() {
    try {
      localStorage.removeItem(`cliffhanger_${userId}`);
      window.dispatchEvent(new CustomEvent("cliffhanger:clear"));
    } catch { /* ignore */ }
    startMainCountdown(remainingMs);
  }
  function handlePause() { clearTimer(); setPhase("paused"); }

  function handleReset() {
    clearTimer();
    setRemainingMs(sessionMs);
    setBreakRemainingMs(breakMs);
    setPhase("idle");
    startedAtRef.current = null;
  }

  function handleExtend() {
    const extra = 5 * 60_000;
    endTimeRef.current += extra;
    setSessionMs((s) => s + extra);
    setRemainingMs((r) => r + extra);
  }

  function handleSkipBreak() { clearTimer(); setPhase("finished"); }

  function handleDurationSelect(mins: number, custom = false) {
    setIsCustom(custom);
    if (!custom) setCustomInput("");
    setSelectedDuration(mins);
    setSessionMs(mins * 60_000);
    setRemainingMs(mins * 60_000);
  }

  function handleCustomInput(val: string) {
    setCustomInput(val);
    const mins = parseInt(val);
    if (!isNaN(mins) && mins >= 1 && mins <= 120) {
      setSelectedDuration(mins);
      setSessionMs(mins * 60_000);
      setRemainingMs(mins * 60_000);
    }
  }

  function handleStartAnother() {
    clearTimer();
    const fresh = selectedDuration * 60_000;
    setSessionMs(fresh);
    setRemainingMs(fresh);
    setBreakRemainingMs(breakMs);
    setPhase("idle");
    startedAtRef.current = null;
    sessionIdRef.current = null;
    setXpEarned(null);
    cliffhangerWordCountRef.current = undefined;
    cliffhangerSlideCountRef.current = undefined;
  }

  const isBreak = phase === "break";
  const displayMs = isBreak ? breakRemainingMs : remainingMs;
  const displayTotal = isBreak ? breakMs : sessionMs;

  const isCelebrating = phase === "celebrating" || phase === "cliffhanger";

  const capyClass =
    phase === "running"
      ? "capy-float"
      : phase === "break"
      ? "animate-pulse"
      : phase === "celebrating"
      ? "animate-spin"
      : "";

  const phaseLabel =
    phase === "idle"        ? t.readyToFocus :
    phase === "running"     ? t.sessionInProgress :
    phase === "paused"      ? t.sessionPaused :
    phase === "cliffhanger" ? t.sessionComplete :
    phase === "celebrating" ? t.sessionComplete :
    phase === "break"       ? breakMessage :
    t.wellDone;

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      {/* ─── DEV ONLY — remove this entire block before production ──────────── */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed top-16 right-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52">
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Dip / Celebration Triggers</span>
          {([
            ["Force cliffhanger modal", () => {
              const litRevQuest = activeQuests.find((q) => q.chapter_title === "Literature Review");
              if (litRevQuest) setSelectedQuestId(litRevQuest.id);
              setPhase("cliffhanger");
            }],
            ["XP toast +10 XP", () => { setDevXpVisible(true); setTimeout(() => setDevXpVisible(false), 3500); }],
            ["Achievement: Gentle Return", () => setCelebrationEvent({ kind: "achievement", icon: "🦫", title: "Gentle Return", desc: "Back after 3+ days. Capy saved your spot." })],
            ["Achievement: First Dip ✨", () => setCelebrationEvent({ kind: "achievement", icon: "✨", title: "First Dip", desc: "Your first dip. The beginning of the flow." })],
            ["Achievement: Deep Day 🏅", () => setCelebrationEvent({ kind: "achievement", icon: "🏅", title: "Deep Day", desc: "5 dips in one day. That's a deep dive." })],
            ["Level-up (Level 3)", () => setCelebrationEvent({ kind: "level-up", level: 3 })],
            ["Streak milestone (7 days)", () => setCelebrationEvent({ kind: "streak", streak: 7 })],
            ["Chapter milestone", () => setCelebrationEvent({ kind: "milestone", message: "That chapter fought back. You won." })],
            ["Delivered celebration", () => setCelebrationEvent({ kind: "delivered" })],
          ] as [string, () => void][]).map(([label, fn]) => (
            <button key={label} type="button" onClick={fn} className="block w-full text-left px-2 py-0.5 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 text-[11px] font-medium transition-colors">{label}</button>
          ))}
          <p className="text-[10px] text-orange-500">⚠ Cliffhanger: navigate away to cancel.</p>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {/* Dev XP toast — DEV ONLY */}
      {process.env.NODE_ENV !== "production" && devXpVisible && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="px-5 py-3 rounded-full shadow-xl text-sm font-bold whitespace-nowrap" style={{ animation: "toast-slide-up 0.3s ease forwards", backgroundColor: "#FDF3E3", color: "#5C3317" }}>
            +10 XP ⭐
          </div>
        </div>
      )}

      {/* Phase label */}
      <p className="text-sm font-semibold text-muted-foreground">{phaseLabel}</p>

      {/* Linked quest */}
      {(phase === "running" || phase === "paused" || phase === "cliffhanger" || phase === "celebrating" || phase === "break" || phase === "finished") && (
        <p className="text-sm text-muted-foreground">
          {selectedQuestId === "free" ? (
            t.freeFocusSession
          ) : (
            <>
              📝 {t.workingOn}{" "}
              <span className="font-medium text-foreground">
                {activeQuests.find((q) => q.id === selectedQuestId)?.title ?? "Unknown quest"}
              </span>
            </>
          )}
        </p>
      )}

      {/* Duration selector */}
      {phase === "idle" && (
        <div className="w-full max-w-xs space-y-2">
          <div className="flex gap-1.5">
            {PRESET_DURATIONS.map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => handleDurationSelect(mins)}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-sm font-medium transition-colors",
                  !isCustom && selectedDuration === mins
                    ? "border-primary bg-accent text-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {mins}m
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleDurationSelect(selectedDuration, true)}
              className={cn(
                "flex-1 rounded-lg border py-1.5 text-sm font-medium transition-colors",
                isCustom
                  ? "border-primary bg-accent text-primary"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {t.custom}
            </button>
          </div>
          {isCustom && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={120}
                placeholder="1–120"
                value={customInput}
                onChange={(e) => handleCustomInput(e.target.value)}
                className="h-8 text-sm text-center"
              />
              <span className="text-sm text-muted-foreground shrink-0">min</span>
            </div>
          )}
        </div>
      )}

      {/* Ambient sound */}
      {phase !== "cliffhanger" && phase !== "celebrating" && phase !== "finished" && (
        <AmbientPlayer />
      )}

      {/* Timer ring */}
      <TimerRing remainingMs={displayMs} totalMs={displayTotal} phase={phase}>
        {isCelebrating ? (
          <span className={cn("text-4xl select-none", capyClass)}>🎉</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/images/сapy-diping.png"
            alt="Capy"
            className={cn("object-contain select-none", capyClass)}
            style={{ width: 112, height: 112 }}
          />
        )}
        <span className="font-display text-4xl font-bold tabular-nums tracking-tight" style={{ color: "#C17F3E" }}>
          {formatTime(displayMs)}
        </span>
        {isBreak && (
          <span className="text-xs text-muted-foreground mt-0.5">break</span>
        )}
      </TimerRing>

      {/* Motivational quote — visible while running */}
      {phase === "running" && (
        <p
          className="text-xs italic text-center max-w-[220px] leading-relaxed"
          style={{
            color: "#7A6055",
            opacity: quoteVisible ? 1 : 0,
            transition: "opacity 0.4s ease",
          }}
        >
          {quotes[quoteIdx]}
        </p>
      )}

      {/* XP celebration */}
      {(phase === "celebrating" || phase === "break" || phase === "finished") && xpEarned && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div className="px-5 py-3 rounded-full shadow-xl text-sm font-bold whitespace-nowrap" style={{ animation: "toast-slide-up 0.3s ease forwards", backgroundColor: "#FDF3E3", color: "#5C3317" }}>
            +{xpEarned} {t.xpEarned}
          </div>
        </div>
      )}

      {/* Controls */}
      {phase === "running" && (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <Button size="lg" onClick={handlePause} className="px-8">{t.pause}</Button>
            <Button variant="outline" onClick={handleReset}>{t.reset}</Button>
            <Button variant="outline" onClick={handleExtend}>+5 min</Button>
          </div>
          {pipSupported && (
            <button
              type="button"
              onClick={() => openPip().catch(() => {})}
              style={pipOpen ? {} : { color: "#5C3317" }}
              className={cn(
                "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors",
                pipOpen
                  ? "border-orange-200 bg-orange-50 text-stone-300"
                  : "border-orange-200 bg-orange-50 hover:bg-orange-100"
              )}
            >
              {pipOpen ? "✕ Close floating timer" : "⛶ Take Capy with you in other tabs"}
            </button>
          )}
        </div>
      )}
      {(phase === "idle" || phase === "paused") && (
        <div className="flex items-center gap-3">
          <Button size="lg" onClick={handleStart} className="px-8">
            {phase === "paused" ? t.resume : t.start}
          </Button>
          <Button variant="outline" onClick={handleReset}>{t.reset}</Button>
        </div>
      )}

      {phase === "break" && (
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSkipBreak}>
            {t.skipBreak}
          </Button>
        </div>
      )}


      {/* Quest selector */}
      {(phase === "idle" || phase === "paused") && (
        <div className="w-full max-w-sm space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">
            Linked quest (optional)
          </label>
          <select
            value={selectedQuestId}
            onChange={(e) => setSelectedQuestId(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="free">{t.freeSession}</option>
            {activeQuests.map((q) => (
              <option key={q.id} value={q.id}>
                {q.chapter_title} · {q.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Post-session UI */}
      {phase === "finished" && (
        <div className="w-full max-w-sm space-y-4">

          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleStartAnother}>
              {t.anotherSession}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>
              {t.backToDashboard}
            </Button>
          </div>
        </div>
      )}

      {/* Achievement toast */}
      {achievementToast && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div
            className="bg-foreground text-background px-5 py-3 rounded-full shadow-xl text-sm font-medium whitespace-nowrap"
            style={
              achievementFading
                ? { opacity: 0, transform: "translateY(12px)", transition: "opacity 0.5s ease, transform 0.5s ease" }
                : { animation: "toast-slide-up 0.3s ease forwards" }
            }
          >
            {achievementToast}
          </div>
        </div>
      )}

      {phase === "cliffhanger" && (
        <CliffhangerPrompt
          userId={userId}
          measurementUnit={measurementUnit}
          projectType={projectType}
          onDone={(wc, sc) => { cliffhangerWordCountRef.current = wc; cliffhangerSlideCountRef.current = sc; setPhase("celebrating"); }}
        />
      )}

      <CelebrationPopup
        event={celebrationEvent}
        onDismiss={() => {
          const next = achievementQueueRef.current.shift();
          setCelebrationEvent(next ? { kind: "achievement", ...next } : null);
        }}
      />
    </div>
  );
}
