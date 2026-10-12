"use client";

import { useTransition } from "react";
import { updateBuddyCheckin } from "@/app/actions/settings";
import { useTranslations } from "@/lib/language-context";
import { cn } from "@/lib/utils";

interface Props {
  buddyCheckinEnabled: boolean;
}

export function SettingsToggle({ buddyCheckinEnabled }: Props) {
  const { t } = useTranslations();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await updateBuddyCheckin(!buddyCheckinEnabled);
    });
  }

  return (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{t.buddyCheckinSetting}</p>
        <p className="text-xs text-muted-foreground">{t.buddyCheckinSettingDesc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={buddyCheckinEnabled}
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
          buddyCheckinEnabled ? "bg-primary" : "bg-input"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
            buddyCheckinEnabled ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
