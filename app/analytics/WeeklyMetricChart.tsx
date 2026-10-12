"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DayData {
  label: string;
  value: number;
}

interface WeekData {
  days: DayData[];
  label: string; // e.g. "Jun 2 – Jun 8"
}

interface Props {
  weeks: WeekData[];       // index 0 = current week, index 1 = last week, etc.
  metricIcon: string;
  metricLabel: string;
  hint: string;
  noMetricText: string;
  thisWeekLabel: string;   // "This Week" / "Diese Woche"
  prevWeekLabel: string;   // "Last Week" / "Letzte Woche"
}

export function WeeklyMetricChart({
  weeks,
  metricIcon,
  metricLabel,
  hint,
  noMetricText,
  thisWeekLabel,
  prevWeekLabel,
}: Props) {
  const [offset, setOffset] = useState(0); // 0 = current week

  const week = weeks[offset] ?? weeks[0];
  const maxVal = Math.max(...week.days.map((d) => d.value), 1);
  const total  = week.days.reduce((s, d) => s + d.value, 0);

  const headingLabel =
    offset === 0 ? thisWeekLabel :
    offset === 1 ? prevWeekLabel :
    week.label;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {metricIcon} {metricLabel} — {headingLabel}
            </CardTitle>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setOffset((o) => Math.min(o + 1, weeks.length - 1))}
                disabled={offset >= weeks.length - 1}
                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors font-bold text-base"
                aria-label="Previous week"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setOffset((o) => Math.max(o - 1, 0))}
                disabled={offset === 0}
                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors font-bold text-base"
                aria-label="Next week"
              >
                →
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground/70">{hint}</p>
        </div>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="h-28 flex items-center justify-center text-sm text-muted-foreground">
            {noMetricText}
          </div>
        ) : (
          <div className="flex items-end gap-1.5 h-28">
            {week.days.map((day, i) => {
              const pct = Math.round((day.value / maxVal) * 100);
              return (
                <div key={i} className="flex flex-col items-center gap-1 flex-1 h-full justify-end">
                  <span className="text-[10px] text-muted-foreground tabular-nums leading-none">
                    {day.value > 0 ? day.value.toLocaleString() : ""}
                  </span>
                  <div
                    className="w-full rounded-t-sm bg-primary"
                    style={{ height: `${Math.max(pct, day.value > 0 ? 3 : 0)}%` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{day.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
