"use client";

import { useState } from "react";

interface DayEntry {
  date: string;
  label: string;
  pomodoros: number;
  quests: number;
  pomodoroText: string;
  questText: string;
}

interface Props {
  entries: DayEntry[];
  showMoreLabel: string;
  showLessLabel: string;
  initialCount?: number;
}

export function ActiveDaysList({ entries, showMoreLabel, showLessLabel, initialCount = 3 }: Props) {
  const [showPrevious, setShowPrevious] = useState(false);

  const recent   = entries.slice(0, initialCount);
  const previous = entries.slice(initialCount);

  return (
    <div className="space-y-2">
      {recent.map((e) => (
        <div key={e.date} className="pl-3 border-l-2 border-l-[#C17F3E] flex items-center gap-3">
          <span className="text-sm flex-1">{e.label}</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            {e.pomodoros > 0 && <span>{e.pomodoroText}</span>}
            {e.pomodoros > 0 && e.quests > 0 && <span className="opacity-40">·</span>}
            {e.quests > 0 && <span>{e.questText}</span>}
          </div>
        </div>
      ))}

      {previous.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowPrevious((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            {showPrevious ? showLessLabel : `${showMoreLabel} (${previous.length})`}
          </button>
          {showPrevious && (
            <div className="space-y-2">
              {previous.map((e) => (
                <div key={e.date} className="pl-3 border-l-2 border-l-[#C17F3E] flex items-center gap-3">
                  <span className="text-sm flex-1">{e.label}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                    {e.pomodoros > 0 && <span>{e.pomodoroText}</span>}
                    {e.pomodoros > 0 && e.quests > 0 && <span className="opacity-40">·</span>}
                    {e.quests > 0 && <span>{e.questText}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
