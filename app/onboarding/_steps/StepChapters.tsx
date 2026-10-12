import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/lib/language-context";

const HEADINGS: Record<string, string> = {
  written_thesis: "Your Chapters",
  research_paper: "Your Chapters",
  mixed:          "Your Phases",
  presentation:   "Your Sections",
  software:       "Your Milestones",
  design_project: "Your Stages",
  creative:       "Your Scenes",
};

const DE_HEADINGS: Record<string, string> = {
  written_thesis: "Deine Kapitel",
  research_paper: "Deine Kapitel",
  mixed:          "Deine Phasen",
  presentation:   "Deine Abschnitte",
  software:       "Deine Meilensteine",
  design_project: "Deine Phasen",
  creative:       "Deine Szenen",
};

const DESCRIPTIONS: Record<string, string> = {
  written_thesis: "Select the chapters you'll be writing.",
  research_paper: "Select the chapters you'll be writing.",
  mixed:          "Select the phases of your project.",
  presentation:   "Select the sections you'll be building.",
  software:       "Select the milestones you'll be working toward.",
  design_project: "Select the stages of your project.",
  creative:       "Select the scenes you'll be writing.",
};

const DE_DESCRIPTIONS: Record<string, string> = {
  written_thesis: "Wähle die Kapitel aus, die du schreiben wirst.",
  research_paper: "Wähle die Kapitel aus, die du schreiben wirst.",
  mixed:          "Wähle die Phasen deines Projekts aus.",
  presentation:   "Wähle die Abschnitte aus, die du aufbauen wirst.",
  software:       "Wähle die Meilensteine aus, auf die du hinarbeitest.",
  design_project: "Wähle die Phasen deines Projekts aus.",
  creative:       "Wähle die Szenen aus, die du schreiben wirst.",
};

const PLACEHOLDERS: Record<string, string> = {
  written_thesis: "Add a chapter…",
  research_paper: "Add a chapter…",
  mixed:          "Add a phase…",
  presentation:   "Add a section…",
  software:       "Add a milestone…",
  design_project: "Add a stage…",
  creative:       "Add a scene…",
};

const DE_PLACEHOLDERS: Record<string, string> = {
  written_thesis: "Kapitel hinzufügen…",
  research_paper: "Kapitel hinzufügen…",
  mixed:          "Phase hinzufügen…",
  presentation:   "Abschnitt hinzufügen…",
  software:       "Meilenstein hinzufügen…",
  design_project: "Phase hinzufügen…",
  creative:       "Szene hinzufügen…",
};

const DEFAULTS: Record<string, string[]> = {
  written_thesis: ["Introduction", "Literature Review", "Methodology", "Results", "Discussion", "Conclusion"],
  research_paper: ["Introduction", "Literature Review", "Methodology", "Results", "Discussion", "Conclusion"],
  mixed:          ["Phase 1", "Phase 2", "Phase 3"],
  presentation:   ["Intro", "Main Points", "Visuals", "Q&A Prep", "Rehearsal"],
  software:       ["Setup", "Core Features", "Testing", "Documentation", "Polish"],
  design_project: ["Research", "Concepts", "Wireframes", "Visual Design", "Handoff"],
  creative:       ["Outline", "Act 1", "Act 2", "Act 3", "Revision"],
};

const DE_DEFAULTS: Record<string, string[]> = {
  written_thesis: ["Einleitung", "Literaturübersicht", "Methodik", "Ergebnisse", "Diskussion", "Fazit"],
  research_paper: ["Einleitung", "Literaturübersicht", "Methodik", "Ergebnisse", "Diskussion", "Fazit"],
  mixed:          ["Phase 1", "Phase 2", "Phase 3"],
  presentation:   ["Einleitung", "Hauptpunkte", "Visualisierungen", "Q&A-Vorbereitung", "Probe"],
  software:       ["Setup", "Kernfunktionen", "Testing", "Dokumentation", "Fertigstellung"],
  design_project: ["Recherche", "Konzepte", "Wireframes", "Visual Design", "Übergabe"],
  creative:       ["Outline", "Akt 1", "Akt 2", "Akt 3", "Überarbeitung"],
};

interface Props {
  value: string[];
  projectType?: string;
  onNext: (chapters: string[]) => void;
}

export function StepChapters({ value, projectType, onNext }: Props) {
  const { t, lang } = useTranslations();

  const type = projectType ?? "written_thesis";
  const headings     = lang === "de" ? DE_HEADINGS     : HEADINGS;
  const descriptions = lang === "de" ? DE_DESCRIPTIONS : DESCRIPTIONS;
  const placeholders = lang === "de" ? DE_PLACEHOLDERS : PLACEHOLDERS;
  const defaults     = lang === "de" ? DE_DEFAULTS     : DEFAULTS;

  const heading     = headings[type]     ?? headings.written_thesis;
  const description = descriptions[type] ?? descriptions.written_thesis;
  const placeholder = placeholders[type] ?? placeholders.written_thesis;
  const defaultList = defaults[type]     ?? defaults.written_thesis;

  const [items, setItems] = useState(() => {
    const seed = value.length > 0 ? value : defaultList;
    return seed.map((label) => ({ label, checked: true }));
  });
  const [newChapter, setNewChapter] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function toggle(index: number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, checked: !item.checked } : item))
    );
  }

  function addChapter() {
    const trimmed = newChapter.trim();
    if (!trimmed) return;
    setItems((prev) => [...prev, { label: trimmed, checked: true }]);
    setNewChapter("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") addChapter();
  }

  const selected = items.filter((i) => i.checked).map((i) => i.label);

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{heading}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-3 py-1">
            <Checkbox
              id={`chapter-${index}`}
              checked={item.checked}
              onCheckedChange={() => toggle(index)}
            />
            <Label htmlFor={`chapter-${index}`} className="cursor-pointer font-normal">
              {item.label}
            </Label>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={newChapter}
          onChange={(e) => setNewChapter(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Button variant="outline" onClick={addChapter} disabled={!newChapter.trim()}>
          +
        </Button>
      </div>

      <Button onClick={() => onNext(selected)} disabled={selected.length === 0} className="self-end">
        {t.continue}
      </Button>
    </div>
  );
}
