"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/language-context";
import type { T } from "@/lib/translations";

const PRESET_UNITS = ["words", "hours", "pages", "commits", "iterations", "slides"] as const;

function getMetricOptions(t: T) {
  return [
    { id: "words",      emoji: "✍️", label: t.metricWords,      desc: t.metricWordsDesc },
    { id: "hours",      emoji: "⏱️", label: t.metricHours,      desc: t.metricHoursDesc },
    { id: "pages",      emoji: "📄", label: t.metricPages,      desc: t.metricPagesDesc },
    { id: "commits",    emoji: "💻", label: t.metricCommits,    desc: t.metricCommitsDesc },
    { id: "iterations", emoji: "🎨", label: t.metricIterations, desc: t.metricIterationsDesc },
    { id: "slides",     emoji: "📋", label: t.metricSlides,     desc: t.metricSlidesDesc },
    { id: "custom",     emoji: "📝", label: t.metricCustom,     desc: t.metricCustomDesc },
  ] as const;
}

interface Props {
  defaultUnit: string;
  onNext: (unit: string) => void;
}

export function StepMetric({ defaultUnit, onNext }: Props) {
  const { t } = useTranslations();
  const options = getMetricOptions(t);

  // If defaultUnit is a preset, pre-select it; if it's custom text, select "custom"
  const isPreset = (PRESET_UNITS as readonly string[]).includes(defaultUnit);
  const [selected, setSelected] = useState<string>(isPreset ? defaultUnit : "custom");
  const [customValue, setCustomValue] = useState(isPreset ? "" : defaultUnit);

  function handleNext() {
    if (selected === "custom") {
      const trimmed = customValue.trim();
      if (trimmed) onNext(trimmed);
    } else {
      onNext(selected);
    }
  }

  const canProceed = selected !== "custom" || customValue.trim().length > 0;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{t.metricStepTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.metricStepSubtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setSelected(opt.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 text-center transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              opt.id === "custom" && "col-span-2 flex-row justify-center gap-3",
              selected === opt.id
                ? "border-primary bg-accent"
                : "border-border bg-card"
            )}
          >
            <span className="text-2xl select-none leading-none">{opt.emoji}</span>
            <span className="text-sm font-medium leading-snug">{opt.label}</span>
            <span className="text-[10px] text-muted-foreground leading-snug">{opt.desc}</span>
          </button>
        ))}
      </div>

      {selected === "custom" && (
        <input
          type="text"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          placeholder={t.metricCustomPlaceholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          autoFocus
        />
      )}

      <Button onClick={handleNext} disabled={!canProceed} className="self-end">
        {t.continue}
      </Button>
    </div>
  );
}
