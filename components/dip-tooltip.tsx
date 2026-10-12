"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useTranslations } from "@/lib/language-context";

interface DipTooltipProps {
  children: React.ReactNode;
  text?: string;
  side?: "top" | "bottom" | "left" | "right";
  showArrow?: boolean;
}

export function DipTooltip({ children, text, side = "top", showArrow = false }: DipTooltipProps) {
  const { t } = useTranslations();
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={showArrow ? 6 : 6}
        className="max-w-[180px] text-center text-[10px] leading-snug px-2.5 py-2"
      >
        {text ?? t.dipTooltip}
        {showArrow && (
          <TooltipPrimitive.Arrow
            width={8}
            height={4}
            className="fill-foreground"
          />
        )}
      </TooltipContent>
    </Tooltip>
  );
}
