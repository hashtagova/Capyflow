import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/lib/language-context";

const TITLES: Record<string, string> = {
  written_thesis: "Your Thesis",
  research_paper: "Your Research Paper",
  design_project: "Your Design Project",
  software:       "Your App / Software",
  creative:       "Your Creative Project",
  presentation:   "Your Presentation",
  mixed:          "Your Project",
};

const DE_TITLES: Record<string, string> = {
  written_thesis: "Deine Thesis",
  research_paper: "Deine Forschungsarbeit",
  design_project: "Dein Designprojekt",
  software:       "Deine App / Software",
  creative:       "Dein kreatives Projekt",
  presentation:   "Deine Präsentation",
  mixed:          "Dein Projekt",
};

const PLACEHOLDERS: Record<string, string> = {
  written_thesis: "e.g. The impact of social media on mental health",
  research_paper: "e.g. Examining bias in large language models",
  design_project: "e.g. Redesigning the onboarding flow for Gen Z users",
  software:       "e.g. A real-time collaboration tool for remote teams",
  creative:       "e.g. A short film about identity and belonging",
  presentation:   "e.g. Pitch deck for a sustainable fashion startup",
  mixed:          "e.g. My final year project",
};

const DE_PLACEHOLDERS: Record<string, string> = {
  written_thesis: "z. B. Der Einfluss sozialer Medien auf die psychische Gesundheit",
  research_paper: "z. B. Vorurteile in großen Sprachmodellen",
  design_project: "z. B. Neugestaltung des Onboardings für Gen Z",
  software:       "z. B. Ein Echtzeit-Kollaborationstool für Remote-Teams",
  creative:       "z. B. Ein Kurzfilm über Identität und Zugehörigkeit",
  presentation:   "z. B. Pitch-Deck für ein nachhaltiges Modeunternehmen",
  mixed:          "z. B. Mein Abschlussprojekt",
};

interface Props {
  value: string;
  projectType?: string;
  onNext: (thesisTitle: string) => void;
}

export function StepThesis({ value, projectType, onNext }: Props) {
  const { t, lang } = useTranslations();
  const [title, setTitle] = useState(value);

  const placeholders = lang === "de" ? DE_PLACEHOLDERS : PLACEHOLDERS;
  const placeholder = (projectType && placeholders[projectType]) ?? placeholders.written_thesis;
  const titles = lang === "de" ? DE_TITLES : TITLES;
  const title_label = (projectType && titles[projectType]) ?? titles.mixed;

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{title_label}</h2>
        <p className="text-muted-foreground">{t.changeItLater}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="thesis-title">{t.whatIsThesisAbout}</Label>
        <Input
          id="thesis-title"
          placeholder={placeholder}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
      </div>
      <Button onClick={() => onNext(title)} disabled={!title.trim()} className="self-end">
        {t.continue}
      </Button>
    </div>
  );
}
