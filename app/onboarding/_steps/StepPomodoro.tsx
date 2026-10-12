import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/lib/language-context";

interface Props {
  value: number;
  onNext: (minutes: number) => void;
  loading?: boolean;
}

export function StepPomodoro({ value, onNext, loading }: Props) {
  const { t } = useTranslations();
  const [selected, setSelected] = useState(value || 25);

  const OPTIONS = [
    { minutes: 25, label: t.pomodoroClassicLabel, description: t.pomodoroClassicDesc },
    { minutes: 45, label: t.pomodoroDeepLabel,    description: t.pomodoroDeepDesc },
    { minutes: 60, label: t.pomodoroFlowLabel,    description: t.pomodoroFlowDesc },
  ];

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">{t.yourFocusStyle}</h2>
        <p className="text-muted-foreground">{t.idealFocusSession}</p>
      </div>

      <div className="flex flex-col gap-3">
        {OPTIONS.map(({ minutes, label, description }) => (
          <button
            key={minutes}
            type="button"
            onClick={() => setSelected(minutes)}
            className={cn(
              "flex items-center gap-4 rounded-lg border p-4 text-left transition-colors",
              selected === minutes
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            )}
          >
            <span className="text-2xl font-bold tabular-nums w-12 text-center">
              {minutes}
              <span className="text-sm font-normal text-muted-foreground">m</span>
            </span>
            <div>
              <p className="font-medium">{label}</p>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </button>
        ))}
      </div>

      <Button onClick={() => onNext(selected)} className="self-end" disabled={loading}>
        {loading ? t.settingUpSpace : t.startMyQuest}
      </Button>
    </div>
  );
}
