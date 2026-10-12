"use client";

import { useState, useTransition } from "react";
import { updateMeasurementUnit } from "@/app/actions/settings";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/language-context";

const UNITS = [
  { id: "words",      emoji: "✍️",  label: "Words" },
  { id: "pages",      emoji: "📄",  label: "Pages" },
  { id: "slides",     emoji: "📋",  label: "Slides" },
  { id: "commits",    emoji: "💻",  label: "Commits" },
  { id: "features",   emoji: "⚙️", label: "Features" },
  { id: "scenes",     emoji: "🎬",  label: "Scenes" },
  { id: "hours",      emoji: "⏱️", label: "Hours" },
  { id: "iterations", emoji: "🔄",  label: "Iterations" },
] as const;

interface Props {
  currentUnit: string;
}

export function MeasurementToggle({ currentUnit }: Props) {
  const { t } = useTranslations();
  const [selected, setSelected] = useState(currentUnit);
  const [isPending, startTransition] = useTransition();

  function handleSelect(unit: string) {
    setSelected(unit);
    startTransition(async () => {
      await updateMeasurementUnit(unit);
    });
  }

  return (
    <div className="py-4 space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{t.measurementSetting}</p>
        <p className="text-xs text-muted-foreground">{t.measurementSettingDesc}</p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
          Changing this affects your existing metric data. Reset progress first if starting fresh.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {UNITS.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => handleSelect(u.id)}
            disabled={isPending}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border-2 p-2 text-center transition-all text-xs",
              selected === u.id
                ? "border-primary bg-accent text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            <span className="text-lg leading-none">{u.emoji}</span>
            <span className="font-medium">{u.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
