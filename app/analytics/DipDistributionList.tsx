"use client";

import { useState } from "react";

interface Item {
  title: string;
  count: number;
  pct: number;
}

interface Props {
  items: Item[];
  showMoreLabel: string;
  showLessLabel: string;
  initialCount?: number;
}

export function DipDistributionList({ items, showMoreLabel, showLessLabel, initialCount = 4 }: Props) {
  const [showAll, setShowAll] = useState(false);

  const visible  = showAll ? items : items.slice(0, initialCount);
  const remaining = items.length - initialCount;

  return (
    <div className="space-y-3">
      {visible.map((c) => (
        <div key={c.title} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate max-w-[75%]">{c.title}</span>
            <span className="text-muted-foreground text-xs tabular-nums shrink-0">{c.count} 💧</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${c.pct}%` }} />
          </div>
        </div>
      ))}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
        >
          {showAll ? showLessLabel : `${showMoreLabel} (${remaining})`}
        </button>
      )}
    </div>
  );
}
