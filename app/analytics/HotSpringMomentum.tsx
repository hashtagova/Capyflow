"use client";

import { useState } from "react";
import { useTranslations } from "@/lib/language-context";

interface Props {
  composite: number;
  /** True once the user has recorded any qualifying activity (quest or Dip).
   *  Prevents the lowest image from reappearing after a user has started working. */
  hasActivity: boolean;
}

export function HotSpringMomentum({ composite, hasActivity }: Props) {
  // ─── DEV ONLY — remove before production ─────────────────────────────────
  const [devComposite, setDevComposite] = useState<number | null>(null);
  // ─────────────────────────────────────────────────────────────────────────

  const { lang } = useTranslations();
  const score = devComposite ?? composite;

  // Visual floor: once the user has recorded activity, never drop below the
  // knee-deep image. The displayed score and progress bar are unaffected.
  const visualScore = score < 21 && hasActivity ? 21 : score;

  const hotSpringImg =
    visualScore >= 81 ? "/images/Hot spring/bliss.png"            :
    visualScore >= 61 ? "/images/Hot spring/almost entirely.png"  :
    visualScore >= 41 ? "/images/Hot spring/waist-deep.png"       :
    visualScore >= 21 ? "/images/Hot spring/knee-deep.png"        :
                        "/images/Hot spring/empty onset.png";
  const hotSpringAlt =
    visualScore >= 81 ? "Capy fully relaxing in the hot spring"  :
    visualScore >= 61 ? "Capy almost fully in the hot spring"    :
    visualScore >= 41 ? "Capy waist-deep in the hot spring"      :
    visualScore >= 21 ? "Capy wading into the hot spring"        :
                        "Capy looking at the empty hot spring";
  const hotSpringHint =
    visualScore >= 81 ? (lang === "de" ? "Sie ist ganz bei sich. Einfach so." : "Capy is fully submerged, eyes closed. She's completely at ease here.") :
    visualScore >= 61 ? "Capy is almost all the way in. The steam is rising. Keep going."          :
    visualScore >= 41 ? "Capy is in up to her waist. The water is warm. This is working."          :
    visualScore >= 21 ? "Capy has dipped her paws in. The spring is warming up."                   :
                        "Capy is sitting by the edge. The water is waiting for her.";

  return (
    <>
      {/* ─── DEV ONLY — remove before production ───────────────────────── */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed top-16 right-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52">
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Hot Spring</span>
          {([
            [90, "♨️ bliss (81–100)"],
            [70, "🌊 almost entirely (61–80)"],
            [50, "🫧 waist-deep (41–60)"],
            [30, "🐾 knee-deep (21–40)"],
            [10, "🏞️ empty onset (0–20)"],
          ] as [number, string][]).map(([val, label]) => (
            <button
              key={val}
              type="button"
              onClick={() => setDevComposite((prev) => prev === val ? null : val)}
              className={`block w-full text-left px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${devComposite === val ? "bg-orange-400 text-white" : "bg-orange-200 hover:bg-orange-300 text-orange-900"}`}
            >
              {label}
            </button>
          ))}
          {devComposite !== null && (
            <button
              type="button"
              onClick={() => setDevComposite(null)}
              className="block w-full text-left px-2 py-0.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-700 text-[11px] font-medium transition-colors border border-orange-300"
            >
              ↩ reset to real score ({composite})
            </button>
          )}
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className="flex items-center gap-4">
        <div className="group relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hotSpringImg}
            alt={hotSpringAlt}
            className="h-24 w-auto object-contain select-none rounded-2xl"
          />
          <div className="pointer-events-none absolute bottom-full left-0 mb-2 hidden group-hover:block w-52 z-50">
            <div className="bg-foreground text-background text-[10px] leading-snug rounded-lg px-2.5 py-2 shadow-lg">
              {hotSpringHint}
            </div>
            <div className="ml-4 mt-0.5 h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-foreground" />
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-bold tabular-nums leading-none">{score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>
    </>
  );
}
