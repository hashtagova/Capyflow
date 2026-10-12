"use client";

import { useTransition } from "react";
import { updateBuddyCheckin } from "@/app/actions/settings";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  enabled: boolean;
}

export function BuddyCheckinToggle({ enabled }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await updateBuddyCheckin(!enabled);
    });
  }

  return (
    <div className="flex items-center justify-between py-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm text-muted-foreground cursor-default select-none">
            🦫 Buddy Check-ins
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px] text-center">
          Capy checks in on you 1–3 times a day to see how you&apos;re feeling. Completely optional.
        </TooltipContent>
      </Tooltip>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
          enabled ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
            enabled ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
