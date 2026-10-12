"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { cn } from "@/lib/utils";
import { saveBuddyCheckin } from "@/app/actions/buddy-checkin";
import { updateBuddyCheckin } from "@/app/actions/settings";
import { useTranslations } from "@/lib/language-context";

// ── Thresholds ────────────────────────────────────────────────
const THRESHOLDS_MS = [
  30 * 60_000,        // 30 minutes
  3 * 60 * 60_000,    // 3 hours
  5 * 60 * 60_000,    // 5 hours
] as const;

const TICK_MS = 10_000; // check every 10 s

// ── localStorage helpers ──────────────────────────────────────
function todayKey(): string {
  return `buddy_checkin_${new Date().toISOString().split("T")[0]}`;
}

function deadlineShownKey(): string {
  return `buddy_deadline_shown_${new Date().toISOString().split("T")[0]}`;
}

interface Stored {
  elapsedMs:  number;
  triggered:  number[]; // thresholds (ms) already fired today
}

function load(): Stored {
  if (typeof window === "undefined") return { elapsedMs: 0, triggered: [] };
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return { elapsedMs: 0, triggered: [] };
    const p = JSON.parse(raw) as Partial<Stored>;
    return {
      elapsedMs: typeof p.elapsedMs === "number" ? p.elapsedMs : 0,
      triggered: Array.isArray(p.triggered) ? p.triggered : [],
    };
  } catch {
    return { elapsedMs: 0, triggered: [] };
  }
}

function save(state: Stored) {
  try { localStorage.setItem(todayKey(), JSON.stringify(state)); } catch { /* quota */ }
}

const THRESHOLD_MESSAGES: Record<number, string> = {
  [30 * 60_000]:      "Hey! How's it going?",
  [3 * 60 * 60_000]:  "Halfway! All\u00a0good?",
  [5 * 60 * 60_000]:  "Still going! Holding up?",
};

const THRESHOLD_IMAGES: Record<number, string> = {
  [30 * 60_000]:      "/images/cappy-asking_1.png",
  [3 * 60 * 60_000]:  "/images/cappy-asking_2.png",
  [5 * 60 * 60_000]:  "/images/cappy-asking_3.png",
};

// ── Types ─────────────────────────────────────────────────────
const MOODS = [
  { key: "happy",   emoji: "😊" },
  { key: "neutral", emoji: "😐" },
  { key: "sad",     emoji: "😔" },
] as const;

type Stage = "asking" | "noting" | "thanks";

interface Props {
  enabled: boolean;
  isDeadlineDay?: boolean;
}

// ── Component ─────────────────────────────────────────────────
export function BuddyCheckinPopup({ enabled, isDeadlineDay }: Props) {
  const { t } = useTranslations();
  const [visible, setVisible]     = useState(false);
  const [fading,  setFading]      = useState(false);
  const [stage,   setStage]       = useState<Stage>("asking");
  const [mood,    setMood]        = useState<string | null>(null);
  const [note,    setNote]        = useState("");
  const [checkinMessage, setCheckinMessage] = useState(THRESHOLD_MESSAGES[30 * 60_000]);
  const [checkinImage, setCheckinImage] = useState(THRESHOLD_IMAGES[30 * 60_000]);
  const [thanksImage, setThanksImage] = useState("/images/cappy-thanks.png");
  const [isPending, startTransition] = useTransition();

  const storedRef   = useRef<Stored>({ elapsedMs: 0, triggered: [] });
  const lastTickRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    storedRef.current = load();
    lastTickRef.current = Date.now();

    // Deadline day: show a special check-in once immediately
    if (isDeadlineDay && !localStorage.getItem(deadlineShownKey())) {
      localStorage.setItem(deadlineShownKey(), "1");
      setCheckinMessage("Today's the day! 🎓 How are you feeling?");
      setCheckinImage("/images/cappy-graduated.png");
      setStage("asking");
      setMood(null);
      setNote("");
      setFading(false);
      setVisible(true);
    }

    intervalRef.current = setInterval(() => {
      const now   = Date.now();
      const delta = document.visibilityState === "visible" ? now - lastTickRef.current : 0;
      lastTickRef.current = now;

      const s = storedRef.current;
      s.elapsedMs += delta;

      // Check each threshold in order; fire the first one not yet triggered today
      for (const threshold of THRESHOLDS_MS) {
        if (s.elapsedMs >= threshold && !s.triggered.includes(threshold)) {
          s.triggered.push(threshold);
          save(s);
          setCheckinMessage(THRESHOLD_MESSAGES[threshold] ?? THRESHOLD_MESSAGES[30 * 60_000]);
          setCheckinImage(THRESHOLD_IMAGES[threshold] ?? THRESHOLD_IMAGES[30 * 60_000]);
          setThanksImage(threshold === 3 * 60 * 60_000 ? "/images/cappy-thanks_2.png" : "/images/cappy-thanks.png");
          setStage("asking");
          setMood(null);
          setNote("");
          setFading(false);
          setVisible(true);
          break; // show one popup at a time
        }
      }

      save(s);
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, isDeadlineDay]);

  function dismiss() {
    setFading(true);
    setTimeout(() => { setVisible(false); setFading(false); }, 400);
  }

  function handleMoodSelect(key: string) {
    setMood(key);
    setStage("noting");
  }

  function handleSave() {
    if (!mood) return;
    startTransition(async () => {
      await saveBuddyCheckin(mood, note || undefined);
      setStage("thanks");
      setTimeout(() => dismiss(), 1800);
    });
  }

  function handleTurnOff() {
    startTransition(async () => {
      await updateBuddyCheckin(false);
      window.dispatchEvent(new CustomEvent("capy:buddy-off"));
      dismiss();
    });
  }

  function handleSkip() {
    if (stage === "noting" && mood) {
      startTransition(async () => {
        await saveBuddyCheckin(mood);
        dismiss();
      });
    } else {
      dismiss();
    }
  }

  return (
    <>
    {/* ─── DEV ONLY — remove this entire block before production ──────────── */}
    {process.env.NODE_ENV !== "production" && (
      <div className="fixed bottom-[120px] left-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52">
        <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Buddy Check-In</span>
        {([
          ["Capy 1 — 30 min (asking)", () => { setCheckinMessage(THRESHOLD_MESSAGES[30 * 60_000]); setCheckinImage(THRESHOLD_IMAGES[30 * 60_000]); setThanksImage("/images/cappy-thanks.png"); setStage("asking"); setMood(null); setNote(""); setFading(false); setVisible(true); }],
          ["Capy 2 — 3 hr (asking)", () => { setCheckinMessage(THRESHOLD_MESSAGES[3 * 60 * 60_000]); setCheckinImage(THRESHOLD_IMAGES[3 * 60 * 60_000]); setThanksImage("/images/cappy-thanks_2.png"); setStage("asking"); setMood(null); setNote(""); setFading(false); setVisible(true); }],
          ["Capy 3 — 5 hr (asking)", () => { setCheckinMessage(THRESHOLD_MESSAGES[5 * 60 * 60_000]); setCheckinImage(THRESHOLD_IMAGES[5 * 60 * 60_000]); setThanksImage("/images/cappy-thanks.png"); setStage("asking"); setMood(null); setNote(""); setFading(false); setVisible(true); }],
          ["Deadline day (asking)", () => { setCheckinMessage("Today's the day! 🎓 How are you feeling?"); setCheckinImage("/images/cappy-graduated.png"); setThanksImage("/images/cappy-thanks.png"); setStage("asking"); setMood(null); setNote(""); setFading(false); setVisible(true); }],
          ["Post-mood — noting (😊)", () => { setCheckinMessage(THRESHOLD_MESSAGES[30 * 60_000]); setCheckinImage(THRESHOLD_IMAGES[30 * 60_000]); setThanksImage("/images/cappy-thanks.png"); setMood("happy"); setNote(""); setStage("noting"); setFading(false); setVisible(true); }],
          ["Thanks stage", () => { setCheckinImage(THRESHOLD_IMAGES[30 * 60_000]); setThanksImage("/images/cappy-thanks.png"); setMood("happy"); setStage("thanks"); setFading(false); setVisible(true); }],
        ] as [string, () => void][]).map(([label, fn]) => (
          <button key={label} type="button" onClick={fn} className="block w-full text-left px-2 py-0.5 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 text-[11px] font-medium transition-colors">{label}</button>
        ))}
      </div>
    )}
    {/* ─────────────────────────────────────────────────────────────────────── */}

    {visible && (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-50 w-80 rounded-2xl border border-primary/40 bg-[#FDF3E3] shadow-xl p-4 space-y-3 min-h-[160px] transition-opacity duration-400",
        fading && "opacity-0 pointer-events-none"
      )}
    >
      {stage === "asking" && (
        <>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={checkinImage} alt="Capy" width={90} height={90} className="object-contain shrink-0" style={{ mixBlendMode: "multiply" }} />
            <div className="flex-1 space-y-2">
              <p className="text-base font-semibold leading-snug text-center">{checkinMessage}</p>
              <div className="flex justify-center gap-4">
                {MOODS.map(({ key, emoji }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleMoodSelect(key)}
                    className="text-3xl hover:scale-125 transition-transform select-none p-1 rounded-lg hover:bg-accent"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleTurnOff}
              disabled={isPending}
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              {t.turnOff}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.buddyCheckinSkip}
            </button>
          </div>
        </>
      )}

      {stage === "noting" && (
        <>
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={checkinImage} alt="Capy" width={90} height={90} className="object-contain shrink-0" style={{ mixBlendMode: "multiply" }} />
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl select-none">
                  {MOODS.find((m) => m.key === mood)?.emoji}
                </span>
                <p className="text-sm font-medium text-muted-foreground">{t.buddyCheckinSayMore}</p>
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="block w-full flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
                placeholder="…"
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleSkip}
              disabled={isPending}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.buddyCheckinSkip}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="text-xs font-medium text-primary hover:opacity-80 transition-opacity"
            >
              {t.buddyCheckinSave}
            </button>
          </div>
        </>
      )}

      {stage === "thanks" && (
        <div className="flex items-center gap-4 py-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={thanksImage} alt="Capy" width={90} height={90} className="object-contain shrink-0" style={{ mixBlendMode: "multiply" }} />
          <p className="text-base font-semibold leading-snug">{t.buddyCheckinThanks}</p>
        </div>
      )}
    </div>
    )}
    </>
  );
}
