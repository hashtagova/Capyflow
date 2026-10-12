"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { Pencil } from "lucide-react";
import { updateThesisTitle } from "@/app/actions/thesis-title";
import { useTranslations } from "@/lib/language-context";

interface Props {
  initialTitle: string;
}

export function ThesisTitleBadge({ initialTitle }: Props) {
  const { t } = useTranslations();
  const [title, setTitle] = useState(initialTitle);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(initialTitle);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(title);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, title]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setIsOpen(false);
  }

  function handleSave() {
    if (!draft.trim() || draft === title) { setIsOpen(false); return; }
    startTransition(async () => {
      const result = await updateThesisTitle(draft);
      if (!result.error) {
        setTitle(draft.trim());
        setIsOpen(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group inline-flex items-center gap-1.5 text-base font-semibold text-[#2C1810] hover:text-primary transition-colors text-left leading-snug"
      >
        {title}
        <Pencil size={13} className="opacity-0 group-hover:opacity-50 transition-opacity shrink-0" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div className="bg-card border border-border rounded-xl shadow-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="font-display text-lg font-semibold">{t.workingOn.replace(":", "")}</h3>
            <input
              ref={inputRef}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isPending}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted transition-colors"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!draft.trim() || isPending}
                className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? "…" : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
