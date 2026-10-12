"use client";

import { DipTooltip } from "@/components/dip-tooltip";

export function DipStatCard({ label, value }: { label: string; value: number }) {
  return (
    <DipTooltip>
      <div className="rounded-xl border-l-4 border-l-primary bg-card border border-border shadow-sm p-3 space-y-0.5 cursor-default">
        <p className="text-xs text-muted-foreground">💧 {label}</p>
        <p className="font-display text-xl font-bold tabular-nums">{value}</p>
      </div>
    </DipTooltip>
  );
}
