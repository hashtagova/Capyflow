"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetProgress } from "@/app/actions/settings";

export function ResetProgressButton() {
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleReset() {
    setResetError(null);
    startTransition(async () => {
      const result = await resetProgress();
      if ("error" in result) {
        setResetError(result.error);
        return;
      }
      setConfirming(false);
      setConfirmText("");
      router.refresh();
    });
  }

  function handleCancel() {
    setConfirming(false);
    setConfirmText("");
    setResetError(null);
  }

  return (
    <div className="py-4 space-y-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-destructive">Reset Progress</p>
        <p className="text-xs text-muted-foreground">
          Clears all chapters, quests, dip sessions, XP, streak, and achievements. Cannot be undone.
        </p>
      </div>

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs font-medium text-destructive border border-destructive/40 rounded-lg px-3 py-1.5 hover:bg-destructive/10 transition-colors"
        >
          Reset all progress
        </button>
      ) : (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-2">
          <p className="text-sm font-medium">Are you sure? This cannot be undone.</p>
          <p className="text-xs text-muted-foreground">All your chapters, quests, dips, XP and streak will be permanently deleted.</p>
          <div className="pt-1 space-y-2">
            <label className="text-xs text-muted-foreground">
              Type <span className="font-mono font-semibold text-destructive">RESET</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="RESET"
              disabled={isPending}
              className="block w-full text-xs border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-destructive disabled:opacity-50"
            />
          </div>
          {resetError && (
            <p className="text-xs text-destructive">{resetError}</p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending || confirmText !== "RESET"}
              className="text-xs font-medium text-white bg-destructive rounded-lg px-3 py-1.5 hover:bg-destructive/90 transition-colors disabled:opacity-50"
            >
              {isPending ? "Resetting…" : "Yes, reset everything"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="text-xs font-medium text-muted-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
