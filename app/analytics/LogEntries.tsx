"use client";

import { useState } from "react";
import { useTranslations } from "@/lib/language-context";

const MOOD_EMOJI: Record<string, string> = { happy: "😊", neutral: "😐", sad: "😔" };

interface Entry {
  id: string;
  mood: string;
  note: string | null;
  created_at: string;
}

interface EntryRowProps {
  entry: Entry;
  lang: string;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  moodLabel: Record<string, string>;
}

function EntryRow({ entry, lang, expanded, setExpanded, moodLabel }: EntryRowProps) {
  const isOpen = expanded === entry.id;
  return (
    <div className="pl-3 border-l-2 border-l-[#C17F3E]">
      <button
        type="button"
        onClick={() => setExpanded(isOpen ? null : entry.id)}
        className="flex items-center gap-2 w-full text-left"
      >
        <span className="text-lg select-none">{MOOD_EMOJI[entry.mood] ?? "🦫"}</span>
        <span className="text-[11px] text-muted-foreground/60">
          {new Date(entry.created_at).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB", {
            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
          })}
        </span>
      </button>
      {isOpen && (
        <div className="mt-1 ml-7 space-y-0.5">
          <p className="text-sm font-medium">{moodLabel[entry.mood] ?? entry.mood}</p>
          {entry.note && (
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
              {entry.note}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function LogEntries({ entries, lang }: { entries: Entry[]; lang: string }) {
  const { t } = useTranslations();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showPrevious, setShowPrevious] = useState(false);

  const moodLabel: Record<string, string> = {
    happy:   t.theLogMoodHappy,
    neutral: t.theLogMoodNeutral,
    sad:     t.theLogMoodSad,
  };

  const recent = entries.slice(0, 3);
  const previous = entries.slice(3);

  return (
    <div className="space-y-2">
      {recent.map((entry) => (
        <EntryRow
          key={entry.id}
          entry={entry}
          lang={lang}
          expanded={expanded}
          setExpanded={setExpanded}
          moodLabel={moodLabel}
        />
      ))}

      {previous.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowPrevious((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            {showPrevious ? t.theLogHidePrevious : `${t.theLogShowPrevious} (${previous.length})`}
          </button>
          {showPrevious && (
            <div className="space-y-2">
              {previous.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  lang={lang}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  moodLabel={moodLabel}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
