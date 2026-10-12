"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { devSwitchProjectType } from "@/app/actions/settings";

const PROJECT_TYPES = [
  { id: "written_thesis", emoji: "📄", label: "Written Thesis",  unit: "words"    },
  { id: "research_paper", emoji: "📊", label: "Research Paper",  unit: "words"    },
  { id: "design_project", emoji: "🎨", label: "Design Project",  unit: "slides"   },
  { id: "software",       emoji: "💻", label: "Software",        unit: "features" },
  { id: "creative",       emoji: "🎬", label: "Creative",        unit: "scenes"   },
  { id: "presentation",   emoji: "📋", label: "Presentation",    unit: "slides"   },
  { id: "mixed",          emoji: "🔬", label: "Mixed/Other",     unit: "both"     },
] as const;

interface Props { currentType: string; }

export function DevProjectTypeSwitcher({ currentType }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [optimisticType, setOptimisticType] = useState<string | null>(null);
  const activeType = optimisticType ?? currentType;

  function handleSwitch(id: string, unit: string) {
    if (id === activeType || isPending) return;
    setOptimisticType(id);
    startTransition(async () => {
      await devSwitchProjectType(id, unit);
      router.refresh();
    });
  }

  return (
    <div className="fixed top-[592px] right-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52"
      style={{ maxHeight: "calc(100vh - 608px)", overflowY: "auto" }}>
      <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">
        🔧 DEV · Project Type{isPending && " …"}
      </span>
      {PROJECT_TYPES.map(({ id, emoji, label, unit }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleSwitch(id, unit)}
          disabled={isPending}
          className={`block w-full text-left px-2 py-0.5 rounded text-[11px] font-medium transition-colors disabled:opacity-60 ${
            activeType === id
              ? "bg-orange-400 text-white"
              : "bg-orange-200 hover:bg-orange-300 text-orange-900"
          }`}
        >
          {emoji} {label}
        </button>
      ))}
      <p className="text-[9px] text-orange-400 pt-0.5">Persists to DB · reloads page</p>
    </div>
  );
}
