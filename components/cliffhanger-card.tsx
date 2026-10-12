"use client";

import { useEffect, useState } from "react";

interface Props {
  userId: string;
}

export function CliffhangerCard({ userId }: Props) {
  const [sentence, setSentence] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`cliffhanger_${userId}`);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { sentence?: unknown };
      if (typeof parsed.sentence === "string" && parsed.sentence) {
        setSentence(parsed.sentence);
      }
    } catch { /* ignore */ }
  }, [userId]);

  useEffect(() => {
    const handleClear = () => setSentence(null);
    window.addEventListener("cliffhanger:clear", handleClear);
    return () => window.removeEventListener("cliffhanger:clear", handleClear);
  }, []);

  function handleDismiss() {
    try { localStorage.removeItem(`cliffhanger_${userId}`); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("cliffhanger:clear"));
  }

  return (
    <>
      {/* ─── DEV ONLY — remove before production ─────────────────────────── */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed bottom-4 left-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52">
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Cliffhanger</span>
          <button
            type="button"
            onClick={() => {
              const fake = "Start with the gap in the literature review — the three studies that contradict each other.";
              try { localStorage.setItem(`cliffhanger_${userId}`, JSON.stringify({ sentence: fake, savedAt: new Date().toISOString() })); } catch { /* ignore */ }
              setSentence(fake);
            }}
            className="block w-full text-left px-2 py-0.5 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 text-[11px] font-medium transition-colors"
          >
            Show cliffhanger card
          </button>
          {sentence && (
            <button
              type="button"
              onClick={handleDismiss}
              className="block w-full text-left px-2 py-0.5 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 text-[11px] font-medium transition-colors"
            >
              Clear cliffhanger card
            </button>
          )}
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────── */}

      {sentence && (
        <div className="rounded-xl border border-primary/20 bg-accent px-4 py-3 flex items-start gap-3">
          <span className="text-lg shrink-0 mt-0.5 select-none">🐾</span>
          <div className="flex-1 space-y-0.5 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              You left off with
            </p>
            <p className="text-sm text-foreground leading-relaxed">
              &ldquo;{sentence}&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
          >
            Got it 👋
          </button>
        </div>
      )}
    </>
  );
}
