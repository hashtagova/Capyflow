"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/language-context";
import type { T } from "@/lib/translations";

function getProjectTypes(t: T) {
  return [
    { id: "written_thesis", emoji: "📄", label: t.projectTypeWrittenThesis, unit: "words" },
    { id: "research_paper", emoji: "📊", label: t.projectTypeResearchPaper,  unit: "words" },
    { id: "design_project", emoji: "🎨", label: t.projectTypeDesignProject,  unit: "slides" },
    { id: "software",       emoji: "💻", label: t.projectTypeSoftware,       unit: "features" },
    { id: "creative",       emoji: "🎬", label: t.projectTypeCreative,       unit: "scenes" },
    { id: "presentation",   emoji: "📋", label: t.projectTypePresentation,   unit: "slides" },
    { id: "mixed",          emoji: "🔬", label: t.projectTypeMixed,          unit: "both" },
  ] as const;
}

interface Props {
  onNext: (projectType: string, measurementUnit: string) => void;
}

export function StepProjectType({ onNext }: Props) {
  const { t } = useTranslations();
  const projectTypes = getProjectTypes(t);
  const [selected, setSelected] = useState<string | null>(null);

  const selectedType = projectTypes.find((p) => p.id === selected);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{t.yourProjectType}</h2>
        <p className="text-sm text-muted-foreground">{t.projectTypeSubtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {projectTypes.map((type) => (
          <button
            key={type.id}
            type="button"
            onClick={() => setSelected(type.id)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              type.id === "mixed" && "col-span-2 flex-row justify-center gap-3",
              selected === type.id
                ? "border-primary bg-accent"
                : "border-border bg-card"
            )}
          >
            <span className="text-3xl select-none leading-none">{type.emoji}</span>
            <span className="text-sm font-medium leading-snug">{type.label}</span>
          </button>
        ))}
      </div>

      <Button
        onClick={() => {
          if (selectedType) onNext(selectedType.id, selectedType.unit);
        }}
        disabled={!selected}
        className="self-end"
      >
        {t.continue}
      </Button>
    </div>
  );
}
