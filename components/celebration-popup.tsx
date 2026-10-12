"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { useTranslations } from "@/lib/language-context";

export type CelebrationEvent =
  | { kind: "level-up"; level: number }
  | { kind: "streak"; streak: number }
  | { kind: "chapter" }
  | { kind: "milestone"; message: string }
  | { kind: "delivered" }
  | { kind: "achievement"; icon: string; title: string; desc: string };

interface Props {
  event: CelebrationEvent | null;
  onDismiss: () => void;
}

const LEVEL_UP_MS = 5000;
const FADE_MS     = 600;   // fade-out duration
const FADE_START  = LEVEL_UP_MS - FADE_MS; // start fading at 4.4 s

// 24 pre-defined confetti pieces — deterministic so SSR/client match
const CONFETTI = [
  { l: "4%",  delay: "0s",    dur: "2.6s", color: "#ff6b6b", size: 8,  round: false },
  { l: "9%",  delay: "0.3s",  dur: "3.0s", color: "#ffd93d", size: 10, round: true  },
  { l: "14%", delay: "0.1s",  dur: "2.8s", color: "#6bcb77", size: 6,  round: false },
  { l: "19%", delay: "0.5s",  dur: "3.2s", color: "#4d96ff", size: 9,  round: true  },
  { l: "24%", delay: "0.2s",  dur: "2.5s", color: "#c77dff", size: 11, round: false },
  { l: "29%", delay: "0.7s",  dur: "3.1s", color: "#ff6dae", size: 7,  round: true  },
  { l: "34%", delay: "0.4s",  dur: "2.9s", color: "#ff6b6b", size: 10, round: false },
  { l: "39%", delay: "0.1s",  dur: "2.7s", color: "#ffd93d", size: 8,  round: true  },
  { l: "44%", delay: "0.6s",  dur: "3.3s", color: "#6bcb77", size: 12, round: false },
  { l: "49%", delay: "0.3s",  dur: "2.6s", color: "#4d96ff", size: 7,  round: true  },
  { l: "54%", delay: "0.8s",  dur: "3.0s", color: "#c77dff", size: 9,  round: false },
  { l: "59%", delay: "0.2s",  dur: "2.8s", color: "#ff6dae", size: 11, round: true  },
  { l: "64%", delay: "0.5s",  dur: "3.2s", color: "#ff6b6b", size: 6,  round: false },
  { l: "69%", delay: "0.1s",  dur: "2.5s", color: "#ffd93d", size: 10, round: true  },
  { l: "74%", delay: "0.9s",  dur: "3.1s", color: "#6bcb77", size: 8,  round: false },
  { l: "79%", delay: "0.4s",  dur: "2.9s", color: "#4d96ff", size: 12, round: true  },
  { l: "84%", delay: "0.2s",  dur: "2.7s", color: "#c77dff", size: 7,  round: false },
  { l: "89%", delay: "0.7s",  dur: "3.3s", color: "#ff6dae", size: 9,  round: true  },
  { l: "94%", delay: "0.3s",  dur: "2.6s", color: "#ff6b6b", size: 11, round: false },
  { l: "12%", delay: "0.6s",  dur: "3.0s", color: "#ffd93d", size: 8,  round: true  },
  { l: "22%", delay: "0.8s",  dur: "2.8s", color: "#6bcb77", size: 10, round: false },
  { l: "42%", delay: "0.1s",  dur: "3.2s", color: "#4d96ff", size: 6,  round: true  },
  { l: "62%", delay: "0.5s",  dur: "2.5s", color: "#c77dff", size: 12, round: false },
  { l: "82%", delay: "0.9s",  dur: "3.1s", color: "#ff6dae", size: 8,  round: true  },
];

export function CelebrationPopup({ event, onDismiss }: Props) {
  const { lang } = useTranslations();
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Guard: prevent onDismiss from firing twice (auto + button click)
  const dismissedRef = useRef(false);

  // Reset state whenever a new event arrives
  useEffect(() => {
    setFading(false);
    dismissedRef.current = false;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [event]);

  // Play fanfare when achievement unlocks
  useEffect(() => {
    if (!event || event.kind !== "achievement") return;
    try {
      const ctx = new AudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = ctx.currentTime + i * 0.14;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
        osc.start(start);
        osc.stop(start + 1.1);
      });
      setTimeout(() => ctx.close(), 3000);
    } catch { /* ignore */ }
  }, [event]);

  // Auto-dismiss: streak after 4 s, level-up after 5 s with fade-out
  useEffect(() => {
    if (!event) return;

    if (event.kind === "streak" || event.kind === "milestone" || event.kind === "delivered" || event.kind === "achievement") {
      const t = setTimeout(onDismiss, 5000);
      return () => clearTimeout(t);
    }

    if (event.kind === "level-up") {
      const fadeTimer    = setTimeout(() => setFading(true), FADE_START);
      const dismissTimer = setTimeout(() => {
        if (!dismissedRef.current) { dismissedRef.current = true; onDismiss(); }
      }, LEVEL_UP_MS);
      return () => { clearTimeout(fadeTimer); clearTimeout(dismissTimer); };
    }
  }, [event, onDismiss]);

  if (!event) return null;

  // Clicking the button fades out then dismisses
  function handleManualDismiss() {
    if (dismissedRef.current) return;
    setFading(true);
    setTimeout(() => {
      if (!dismissedRef.current) { dismissedRef.current = true; onDismiss(); }
    }, FADE_MS);
  }

  // ── Milestone: full-screen warm overlay, rendered in a portal to escape stacking contexts ──
  if (event.kind === "milestone") {
    return createPortal(
      <div
        className="flex flex-col items-center justify-center cursor-pointer select-none"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          backgroundColor: "#faf8f4",
          opacity: fading ? 0 : 1,
          transition: "opacity 500ms ease-out",
        }}
        onClick={onDismiss}
      >
        <video
          key={event.message}
          ref={videoRef}
          src="/images/cappy-celebration.mp4"
          autoPlay
          muted
          loop
          playsInline
          style={{
            maxHeight: "70vh",
            maxWidth: "80vw",
            objectFit: "contain",
            display: "block",
            mixBlendMode: "multiply",
            borderRadius: "12px",
          }}
        />
        <div
          className="font-display font-semibold text-center leading-snug"
          style={{ color: "#5C3317", fontSize: "1.5rem", marginTop: "2rem", padding: "0 2rem", maxWidth: "360px" }}
        >
          {event.message.split(". ").map((line, i, arr) => (
            <p key={i}>
              {line}{i < arr.length - 1 ? "." : ""}
              {i === 0 && " 🎉"}
            </p>
          ))}
        </div>
        <p style={{ fontSize: "0.75rem", color: "#a09080", marginTop: "1.5rem", letterSpacing: "0.05em" }}>
          🐾 tap anywhere to continue
        </p>
      </div>,
      document.body
    );
  }

  // ── Delivered: full-screen celebration portal (placeholder video) ──
  if (event.kind === "delivered") {
    return createPortal(
      <div
        className="flex flex-col items-center justify-center cursor-pointer select-none"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          backgroundColor: "#faf8f4",
          opacity: fading ? 0 : 1,
          transition: "opacity 500ms ease-out",
        }}
        onClick={onDismiss}
      >
        {/* Placeholder: swap /images/cappy-delivered.mp4 once ready */}
        <video
          ref={videoRef}
          src="/images/cappy-celebration.mp4"
          autoPlay
          muted
          loop
          playsInline
          style={{
            maxHeight: "70vh",
            maxWidth: "80vw",
            objectFit: "contain",
            display: "block",
            mixBlendMode: "multiply",
            borderRadius: "12px",
          }}
        />
        <div
          className="font-display font-semibold text-center leading-snug"
          style={{ color: "#5C3317", fontSize: "1.5rem", marginTop: "2rem", padding: "0 2rem", maxWidth: "360px" }}
        >
          <p>You delivered it. 🎉</p>
          <p style={{ fontSize: "1.1rem", marginTop: "0.5rem", fontWeight: 400, color: "#7A6055" }}>
            Every dip brought you here.
          </p>
        </div>
        <p style={{ fontSize: "0.75rem", color: "#a09080", marginTop: "1.5rem", letterSpacing: "0.05em" }}>
          🐾 tap anywhere to continue
        </p>
      </div>,
      document.body
    );
  }

  // ── Achievement unlocked: full-screen portal ──
  if (event.kind === "achievement") {
    return createPortal(
      <div
        className="flex flex-col items-center justify-center cursor-pointer select-none"
        style={{
          position: "fixed", top: 0, left: 0,
          width: "100vw", height: "100vh",
          zIndex: 9999,
          backgroundColor: "#faf8f4",
          opacity: fading ? 0 : 1,
          transition: "opacity 500ms ease-out",
        }}
        onClick={handleManualDismiss}
      >
        <div style={{ fontSize: "6rem", lineHeight: 1 }}>{event.icon}</div>
        <p style={{ fontSize: "0.75rem", color: "#a09080", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "1.5rem" }}>
          Achievement Unlocked
        </p>
        <div
          className="font-display font-semibold text-center"
          style={{ color: "#5C3317", fontSize: "1.6rem", marginTop: "0.5rem", padding: "0 2rem", maxWidth: "360px" }}
        >
          {event.title}
        </div>
        <p style={{ fontSize: "0.9rem", color: "#7A6055", marginTop: "0.5rem", padding: "0 2rem", maxWidth: "320px", textAlign: "center", lineHeight: 1.5 }}>
          {event.desc}
        </p>
        <p style={{ fontSize: "0.75rem", color: "#a09080", marginTop: "2rem", letterSpacing: "0.05em" }}>
          🐾 tap anywhere to continue
        </p>
      </div>,
      document.body
    );
  }

  const isLevelUp = event.kind === "level-up";

  return (
    <>
      {/* Confetti — level-up only */}
      {isLevelUp &&
        CONFETTI.map((c, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: c.l,
              width: c.size,
              height: c.size,
              backgroundColor: c.color,
              borderRadius: c.round ? "50%" : "2px",
              animationDuration: c.dur,
              animationDelay: c.delay,
            }}
          />
        ))}

      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        style={{
          opacity: fading ? 0 : 1,
          transition: `opacity ${FADE_MS}ms ease-out`,
        }}
        onClick={event.kind !== "level-up" ? onDismiss : undefined}
      >
        <div
          className="relative bg-card border rounded-2xl shadow-2xl p-8 mx-4 max-w-sm w-full text-center space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Level up ── */}
          {event.kind === "level-up" && (
            <>
              <div className="text-6xl animate-bounce">🎉</div>
              <div>
                <h2 className="text-3xl font-bold">Level Up!</h2>
                <p className="text-muted-foreground mt-1">
                  You are now{" "}
                  <span className="font-semibold text-foreground">Level {event.level}</span>
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {lang === "de"
                  ? `🦫 Level ${event.level}. Das summiert sich.`
                  : `🦫 Level ${event.level}. That's real work adding up.`}
              </p>

              {/* Progress bar — drains over LEVEL_UP_MS */}
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{
                    animation: `progress-drain ${LEVEL_UP_MS}ms linear forwards`,
                  }}
                />
              </div>

              <Button className="w-full" onClick={handleManualDismiss}>
                Let&apos;s keep going!
              </Button>
            </>
          )}

          {/* ── Streak milestone ── */}
          {event.kind === "streak" && (
            <>
              <div className="text-5xl">🔥</div>
              <div>
                <h2 className="text-2xl font-bold">{event.streak} day streak!</h2>
                <p className="text-muted-foreground mt-1">
                  {event.streak >= 30
                    ? "Incredible dedication! 🏆"
                    : event.streak >= 14
                    ? "Two weeks strong! Amazing! 💪"
                    : "One week! You're on fire! 🦫"}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Tap anywhere to dismiss</p>
            </>
          )}

          {/* ── Chapter complete ── */}
          {event.kind === "chapter" && (
            <>
              <div className="text-5xl">🎓</div>
              <div>
                <h2 className="text-2xl font-bold">Chapter complete!</h2>
                <p className="text-muted-foreground mt-1">All quests in this chapter done.</p>
              </div>
              <p className="text-sm text-muted-foreground">🦫 Another chapter conquered!</p>
              <Button variant="outline" className="w-full" onClick={onDismiss}>
                Onward!
              </Button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
