"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TOAST_THRESHOLD_MS   = 60 * 60_000;  // 60 minutes
const OVERLAY_THRESHOLD_MS = 90 * 60_000;  // 90 minutes
const TICK_MS              = 10_000;        // check every 10 s

// ── localStorage helpers ─────────────────────���───────────────
function todayKey(): string {
  return `work_limit_${new Date().toISOString().split("T")[0]}`;
}

interface Stored {
  elapsedMs:        number;
  toastShown:       boolean;
  overlayDismissed: boolean;
}

function load(): Stored {
  if (typeof window === "undefined")
    return { elapsedMs: 0, toastShown: false, overlayDismissed: false };
  try {
    const raw = localStorage.getItem(todayKey());
    if (!raw) return { elapsedMs: 0, toastShown: false, overlayDismissed: false };
    const parsed = JSON.parse(raw) as Partial<Stored>;
    return {
      elapsedMs:        typeof parsed.elapsedMs  === "number"  ? parsed.elapsedMs  : 0,
      toastShown:       typeof parsed.toastShown === "boolean" ? parsed.toastShown : false,
      overlayDismissed: typeof parsed.overlayDismissed === "boolean" ? parsed.overlayDismissed : false,
    };
  } catch {
    return { elapsedMs: 0, toastShown: false, overlayDismissed: false };
  }
}

function save(state: Stored) {
  try { localStorage.setItem(todayKey(), JSON.stringify(state)); } catch { /* quota */ }
}

const BREAK_MESSAGES = [
  "Step away from the screen. It'll still be there. 🌿",
  "One TikTok. Just one. We both know how this ends. 📱",
  "This is the break. Not later. Now. ☕",
  "Go look at something that isn't a document. 👀",
  "Sit weird. Stretch strange. You know what to do. 🦫",
  "Drink water. Capy insists. 💧",
  "Nothing is due in the next five minutes. Nothing. 🫧",
  "You're allowed to just exist for a moment. 🌀",
  "Capy stepped out too. Back in five. 🦫",
  "The work is paused. You can be paused too. ✨",
] as const;

// ── Component ────────────────────────────────────────────────
export function WorkLimitBanner() {
  const [toastVisible,  setToastVisible]  = useState(false);
  const [toastFading,   setToastFading]   = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [videoFailed,   setVideoFailed]   = useState(false);
  const [breakMessage] = useState(() => BREAK_MESSAGES[Math.floor(Math.random() * BREAK_MESSAGES.length)]);

  // Refs hold the live values used inside the interval closure
  const storedRef   = useRef<Stored>({ elapsedMs: 0, toastShown: false, overlayDismissed: false });
  const lastTickRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const initial = load();
    storedRef.current = initial;
    lastTickRef.current = Date.now();

    // If the overlay was already dismissed today, never show it again this session
    // (toastShown is persisted so we skip the 60-min toast on refresh too)

    intervalRef.current = setInterval(() => {
      const now   = Date.now();
      const delta = document.visibilityState === "visible" ? now - lastTickRef.current : 0;
      lastTickRef.current = now;

      const s = storedRef.current;
      s.elapsedMs += delta;

      // ── 60-min toast ──
      if (!s.toastShown && s.elapsedMs >= TOAST_THRESHOLD_MS) {
        s.toastShown = true;
        setToastVisible(true);
        // Auto-dismiss the toast after 8 s
        setTimeout(() => {
          setToastFading(true);
          setTimeout(() => {
            setToastVisible(false);
            setToastFading(false);
          }, 500);
        }, 8_000);
      }

      // ── 90-min overlay ──
      if (!s.overlayDismissed && s.elapsedMs >= OVERLAY_THRESHOLD_MS) {
        // Only trigger once per session — guard with a flag so repeated ticks don't re-fire
        if (!overlayVisible) setOverlayVisible(true);
      }

      save(s);
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDismissOverlay() {
    storedRef.current.overlayDismissed = true;
    save(storedRef.current);
    setOverlayVisible(false);
  }

  return (
    <>
      {/* ─── DEV ONLY — remove this entire block before production ──────────── */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed top-16 left-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52">
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Work Limit</span>
          <button
            type="button"
            onClick={() => {
              setToastVisible(true);
              setTimeout(() => { setToastFading(true); setTimeout(() => { setToastVisible(false); setToastFading(false); }, 500); }, 8_000);
            }}
            className="block w-full text-left px-2 py-0.5 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 text-[11px] font-medium transition-colors"
          >
            Show 60-min toast
          </button>
          <button
            type="button"
            onClick={() => { storedRef.current.overlayDismissed = false; setOverlayVisible(true); }}
            className="block w-full text-left px-2 py-0.5 rounded bg-orange-200 hover:bg-orange-300 text-orange-900 text-[11px] font-medium transition-colors"
          >
            Show 90-min overlay
          </button>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────────── */}

      {/* ── 60-min toast ── */}
      {toastVisible && (
        <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none">
          <div
            className="bg-foreground text-background px-5 py-3 rounded-full shadow-xl text-sm font-medium whitespace-nowrap"
            style={
              toastFading
                ? { opacity: 0, transform: "translateY(12px)", transition: "opacity 0.5s ease, transform 0.5s ease" }
                : { animation: "toast-slide-up 0.3s ease forwards" }
            }
          >
            You&apos;ve been working for an hour. Maybe a short break? 🐾
          </div>
        </div>
      )}

      {/* ── 90-min full-screen rest overlay (portal so it covers the navbar) ── */}
      {overlayVisible && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 9999,
            backgroundColor: "#faf8f4",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={handleDismissOverlay}
        >
          {videoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/images/cappy-sleeping.png"
              alt="Capy sleeping"
              style={{ maxHeight: "70vh", maxWidth: "80vw", objectFit: "contain", display: "block", mixBlendMode: "multiply" }}
            />
          ) : (
            <video
              key={overlayVisible ? "rest-video" : ""}
              src="/images/cappy-rest-overlay.mp4"
              autoPlay
              playsInline
              onError={() => setVideoFailed(true)}
              style={{ maxHeight: "70vh", maxWidth: "80vw", objectFit: "contain", display: "block", mixBlendMode: "multiply" }}
            />
          )}

          <div className="font-display font-semibold text-center leading-snug"
            style={{ color: "#5C3317", fontSize: "1.5rem", marginTop: "2rem", padding: "0 2rem", maxWidth: "360px" }}
          >
            <p>That&apos;s enough for today.</p>
            <p style={{ fontWeight: 400, fontSize: "1rem", color: "#a09080", marginTop: "0.5rem" }}>
              {breakMessage}
            </p>
          </div>

          <button
            onClick={handleDismissOverlay}
            style={{ marginTop: "2rem", fontSize: "0.85rem", color: "#a09080", letterSpacing: "0.05em" }}
          >
            Got it 👋
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
