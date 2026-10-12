"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
  measurementUnit?: string;
  projectType?: string;
  onDone: (wordCount?: number, slideCount?: number) => void;
}

function getModalHeading(projectType?: string): string {
  switch (projectType) {
    case "software":        return "What's your first line of code for next time?";
    case "design_project":  return "What's your first action for next time?";
    case "creative":        return "What's your first move for next time?";
    case "presentation":    return "What's your first slide idea for next time?";
    case "mixed":           return "What's your first step for next time?";
    default:                return "What's your first sentence for next time?";
  }
}

function getSentencePlaceholder(projectType?: string): string {
  switch (projectType) {
    case "written_thesis":  return "e.g. Start with how engagement theory connects to player motivation…";
    case "research_paper":  return "e.g. Start with the gap in literature…";
    case "software":        return "e.g. Start with the login module…";
    case "design_project":  return "e.g. Start with the mood board…";
    case "creative":        return "e.g. Start with the opening scene…";
    case "presentation":    return "e.g. Start with the hook slide…";
    case "mixed":           return "e.g. Start with the hardest part…";
    default:                return "e.g. Start with the gap in literature…";
  }
}

function getCountLabel(unit: string): string {
  switch (unit) {
    case "slides":     return "Slides created this session";
    case "features":   return "Features completed this session";
    case "scenes":     return "Scenes completed this session";
    case "hours":      return "Hours spent this session";
    case "pages":      return "Pages completed this session";
    case "commits":    return "Commits this session";
    case "iterations": return "Iterations completed this session";
    case "words":      return "Words written this session";
    default:           return unit ? `${unit} this session` : "Words written this session";
  }
}

function getCountPlaceholder(unit: string): string {
  switch (unit) {
    case "slides":     return "e.g. 4";
    case "features":   return "e.g. 2";
    case "scenes":     return "e.g. 3";
    case "hours":      return "e.g. 2";
    case "pages":      return "e.g. 5";
    case "commits":    return "e.g. 3";
    case "iterations": return "e.g. 2";
    default:           return "e.g. 350";
  }
}

export function CliffhangerPrompt({ userId, measurementUnit = "words", projectType, onDone }: Props) {
  const [sentence, setSentence] = useState("");
  const [primaryInput, setPrimaryInput] = useState("");
  const [slideInput, setSlideInput] = useState("");

  const isBoth = measurementUnit === "both";
  const primaryUnit = isBoth ? "words" : measurementUnit;

  function getPrimary(): number | undefined {
    const n = parseInt(primaryInput);
    return !isNaN(n) && n >= 0 ? n : undefined;
  }

  function getSlide(): number | undefined {
    const n = parseInt(slideInput);
    return !isNaN(n) && n >= 0 ? n : undefined;
  }

  function handleSave() {
    const trimmed = sentence.trim();
    if (trimmed) {
      try {
        localStorage.setItem(
          `cliffhanger_${userId}`,
          JSON.stringify({ sentence: trimmed, savedAt: new Date().toISOString() })
        );
      } catch { /* storage quota */ }
    }
    const primary = getPrimary();
    const slide = isBoth ? getSlide() : undefined;
    onDone(primary, slide);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">

        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            🐾 Before you go
          </p>
          <h2 className="font-display text-lg font-semibold leading-snug">
            {getModalHeading(projectType)}
          </h2>
        </div>

        <textarea
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSave(); }
          }}
          placeholder={getSentencePlaceholder(projectType)}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
        />

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">
            {getCountLabel(primaryUnit)}
          </label>
          <p className="text-[11px] text-muted-foreground/60">💧 Enter 0 if none — Capy uses this to track your momentum</p>
          <input
            type="number"
            min={0}
            placeholder={getCountPlaceholder(primaryUnit)}
            value={primaryInput}
            onChange={(e) => setPrimaryInput(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
          />
        </div>

        {isBoth && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              Slides created this session
            </label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 4"
              value={slideInput}
              onChange={(e) => setSlideInput(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60"
            />
            <p className="text-[11px] text-muted-foreground/60">💧 Enter 0 if none — Capy uses this to track your momentum</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} size="sm">
            Save &amp; finish
          </Button>
        </div>

      </div>
    </div>
  );
}
