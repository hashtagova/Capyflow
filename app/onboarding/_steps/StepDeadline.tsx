import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "@/lib/language-context";

const SUBTITLES: Record<string, string> = {
  written_thesis: "When do you need to submit your thesis?",
  research_paper: "When is your paper due?",
  design_project: "When does your design project need to be delivered?",
  software:       "When does your app / software need to be ready?",
  creative:       "When do you need to wrap up your creative project?",
  presentation:   "When is your presentation?",
  mixed:          "When do you need to finish?",
};

const DE_SUBTITLES: Record<string, string> = {
  written_thesis: "Wann musst du deine Thesis abgeben?",
  research_paper: "Wann ist deine Arbeit fällig?",
  design_project: "Wann muss dein Designprojekt fertig sein?",
  software:       "Wann muss deine App / Software bereit sein?",
  creative:       "Wann musst du dein kreatives Projekt abschließen?",
  presentation:   "Wann ist deine Präsentation?",
  mixed:          "Wann musst du fertig sein?",
};

interface Props {
  value: string;
  projectType?: string;
  onNext: (deadline: string) => void;
}

export function StepDeadline({ value, projectType, onNext }: Props) {
  const { t, lang } = useTranslations();
  const [deadline, setDeadline] = useState(value);

  const subtitles = lang === "de" ? DE_SUBTITLES : SUBTITLES;
  const subtitle = (projectType && subtitles[projectType]) ?? subtitles.mixed;

  // Min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{t.theDeadline}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="deadline">{t.submissionDate}</Label>
        <Input
          id="deadline"
          type="date"
          min={minDate}
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="w-full"
        />
      </div>
      <div className="flex gap-3 self-end">
        <Button variant="ghost" onClick={() => onNext("")}>
          {t.skipForNow}
        </Button>
        <Button onClick={() => onNext(deadline)} disabled={!deadline}>
          {t.continue}
        </Button>
      </div>
    </div>
  );
}
