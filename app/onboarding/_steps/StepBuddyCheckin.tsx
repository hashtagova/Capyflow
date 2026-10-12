"use client";

import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/language-context";

interface Props {
  onNext: (enabled: boolean) => void;
  loading?: boolean;
}

export function StepBuddyCheckin({ onNext, loading }: Props) {
  const { t } = useTranslations();

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="space-y-2 text-center">
        <span className="text-5xl select-none">🦫</span>
        <h2 className="text-2xl font-bold">{t.buddyCheckinStepTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.buddyCheckinStepSubtitle}</p>
      </div>

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => onNext(true)}
          disabled={loading}
          className="w-full py-6 text-base"
        >
          {t.buddyCheckinYes}
        </Button>
        <Button
          variant="ghost"
          onClick={() => onNext(false)}
          disabled={loading}
          className="w-full text-muted-foreground"
        >
          {loading ? t.settingUpSpace : t.buddyCheckinNo}
        </Button>
      </div>
    </div>
  );
}
