"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/language-context";

const LS_KEY = "capy_welcomed_back";

const MESSAGES = {
  en: {
    short: [
      "Hey. Good to see you. Capy kept your spot warm.",
      "There you are. Capy's been taking it easy. Ready when you are.",
    ],
    medium: [
      "Hey, you're back. Capy didn't go anywhere. Neither did your work.",
      "There you are. No rush, no fuss. Capy saved your place.",
    ],
    long: [
      "Hey. Time off happens. Capy's right where you left it. Let's pick up gently.",
      "Welcome back. However long it's been, it's fine. Capy's just glad you're here.",
    ],
  },
  de: {
    short: [
      "Hey. Schön, dich zu sehen. Capy hat deinen Platz warmgehalten.",
      "Da bist du ja. Capy hat's ruhig angehen lassen. Leg los, wann immer du magst.",
    ],
    medium: [
      "Hey, du bist zurück. Capy ist nirgendwo hin. Deine Arbeit auch nicht.",
      "Da bist du ja. Keine Eile, kein Stress. Capy hat deinen Platz freigehalten.",
    ],
    long: [
      "Hey. Pausen gehören dazu. Capy ist genau da, wo du es gelassen hast. Lass uns ruhig wieder einsteigen.",
      "Willkommen zurück. Egal wie lang es her ist, alles gut. Capy freut sich einfach, dass du da bist.",
    ],
  },
};

function pickMessage(lastActiveDate: string, lang: "en" | "de"): string {
  const today = new Date().toISOString().split("T")[0];
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysAway = Math.round(
    (new Date(today).getTime() - new Date(lastActiveDate).getTime()) / msPerDay
  );

  const set = MESSAGES[lang];
  const bucket =
    daysAway >= 7 ? set.long
    : daysAway >= 3 ? set.medium
    : set.short;

  return bucket[Math.floor(Math.random() * bucket.length)];
}

interface Props {
  lastActiveDate: string | null; // "YYYY-MM-DD" or null (new user)
}

export function ReturnGreeting({ lastActiveDate }: Props) {
  const { lang } = useTranslations();
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  // Lazy initializer so the message is chosen once on mount and stable across re-renders
  const [message] = useState<string>(() =>
    lastActiveDate ? pickMessage(lastActiveDate, lang) : ""
  );

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    // Already welcomed today in this session
    if (localStorage.getItem(LS_KEY) === today) return;

    // New user (no history) or already active today
    if (!lastActiveDate || lastActiveDate >= today) return;

    // Show the card and mark as welcomed today
    setVisible(true);
    localStorage.setItem(LS_KEY, today);

    const autoFade = setTimeout(() => startFade(), 5000);
    return () => clearTimeout(autoFade);
  }, [lastActiveDate]);

  function startFade() {
    setFading(true);
    setTimeout(() => setVisible(false), 500);
  }

  if (!visible) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-accent px-4 py-3 flex items-center gap-3 transition-opacity duration-500",
        fading && "opacity-0 pointer-events-none"
      )}
    >
      <span className="text-2xl shrink-0 select-none">🦫</span>
      <p className="flex-1 text-sm text-foreground leading-relaxed">
        {message}
      </p>
      <button
        type="button"
        onClick={startFade}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 whitespace-nowrap"
      >
        👋 got it
      </button>
    </div>
  );
}
