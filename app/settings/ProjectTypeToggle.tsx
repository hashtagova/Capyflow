"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProjectType } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

const PROJECT_TYPES = [
  { id: "written_thesis", emoji: "📄", label: "Written Thesis" },
  { id: "research_paper", emoji: "📊", label: "Research Paper" },
  { id: "design_project", emoji: "🎨", label: "Design Project" },
  { id: "software",       emoji: "💻", label: "Software" },
  { id: "creative",       emoji: "🎬", label: "Creative" },
  { id: "presentation",   emoji: "📋", label: "Presentation" },
  { id: "mixed",          emoji: "🔬", label: "Mixed" },
] as const;

interface Props {
  currentType: string;
}

export function ProjectTypeToggle({ currentType }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentType);
  const [isPending, startTransition] = useTransition();

  function handleSelect(type: string) {
    setSelected(type);
    startTransition(async () => {
      const result = await updateProjectType(type);
      if (!("error" in result)) {
        router.refresh();
      }
    });
  }

  return (
    <div className="py-4 space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Project Type</p>
        <p className="text-xs text-muted-foreground">Personalises achievement names and pomodoro quotes.</p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
          Switching projects? Reset progress first so your chapters and quests start fresh.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {PROJECT_TYPES.map((pt) => (
          <button
            key={pt.id}
            type="button"
            onClick={() => handleSelect(pt.id)}
            disabled={isPending}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border-2 p-2 text-center transition-all text-xs",
              selected === pt.id
                ? "border-primary bg-accent text-foreground"
                : "border-border text-muted-foreground hover:border-primary/40"
            )}
          >
            <span className="text-lg leading-none">{pt.emoji}</span>
            <span className="font-medium leading-tight">{pt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
