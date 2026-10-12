"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LS_KEY = "capyflow_active_dip";

interface DipState {
  endsAt: number | null;
  remainingMs?: number;
  phase: "running" | "paused" | "break";
  questTitle?: string | null;
}

function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function ActiveDipWidget() {
  const pathname = usePathname();
  const [dip, setDip] = useState<DipState | null>(null);
  const [remaining, setRemaining] = useState(0);

  // PiP
  const pipWindowRef = useRef<Window | null>(null);
  const pipTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pipOpen, setPipOpen] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  useEffect(() => { setPipSupported("documentPictureInPicture" in window); }, []);

  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        setDip(raw ? (JSON.parse(raw) as DipState) : null);
      } catch {
        setDip(null);
      }
    }
    read();
    const poll = setInterval(read, 1000);
    window.addEventListener("storage", read);
    return () => { clearInterval(poll); window.removeEventListener("storage", read); };
  }, []);

  useEffect(() => {
    if (!dip) return;
    function tick() {
      if (!dip) return;
      if (dip.phase === "paused") setRemaining(dip.remainingMs ?? 0);
      else if (dip.endsAt) setRemaining(Math.max(0, dip.endsAt - Date.now()));
    }
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [dip]);

  // Auto-close PiP when widget disappears or user navigates to /pomodoro
  useEffect(() => {
    if (!dip || pathname === "/pomodoro") closePip();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dip, pathname]);

  function closePip() {
    if (pipTickRef.current) { clearInterval(pipTickRef.current); pipTickRef.current = null; }
    if (pipWindowRef.current && !pipWindowRef.current.closed) pipWindowRef.current.close();
    pipWindowRef.current = null;
    setPipOpen(false);
  }

  async function openPip() {
    if (!("documentPictureInPicture" in window)) return;
    if (pipWindowRef.current && !pipWindowRef.current.closed) { closePip(); return; }
    setPipOpen(true);
    try {
      // @ts-expect-error – documentPictureInPicture not yet in TS lib
      const pip: Window = await window.documentPictureInPicture.requestWindow({ width: 280, height: 160 });
      pipWindowRef.current = pip;

      const body = pip.document.body;
      body.style.cssText = "margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;user-select:none;";

      const wrap = pip.document.createElement("div");
      wrap.style.cssText = "width:100%;height:100%;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;";

      const closeBtn = pip.document.createElement("button");
      closeBtn.textContent = "✕";
      closeBtn.style.cssText = "position:absolute;top:8px;right:10px;background:none;border:none;cursor:pointer;font-size:14px;opacity:0.45;line-height:1;padding:2px 4px;border-radius:4px;";
      closeBtn.onmouseenter = () => { closeBtn.style.opacity = "0.9"; };
      closeBtn.onmouseleave = () => { closeBtn.style.opacity = "0.45"; };
      closeBtn.onclick = () => closePip();

      const emojiEl = pip.document.createElement("div");
      emojiEl.style.cssText = "font-size:28px;line-height:1;";
      const labelEl = pip.document.createElement("div");
      labelEl.style.cssText = "font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;opacity:0.7;";
      const timeEl = pip.document.createElement("div");
      timeEl.style.cssText = "font-size:40px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1;letter-spacing:-1px;";
      const questEl = pip.document.createElement("div");
      questEl.style.cssText = "font-size:10px;opacity:0.6;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px;";

      wrap.append(closeBtn, emojiEl, labelEl, timeEl, questEl);
      body.appendChild(wrap);

      const update = () => {
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (!raw) return;
          const d = JSON.parse(raw) as { phase: string; endsAt?: number | null; remainingMs?: number; questTitle?: string | null };
          const isBreak = d.phase === "break";
          const isPaused = d.phase === "paused";
          let ms = 0;
          if (isPaused) ms = d.remainingMs ?? 0;
          else if (d.endsAt) ms = Math.max(0, d.endsAt - Date.now());
          const bg = isBreak ? "#1e3a5f" : isPaused ? "#3d2e28" : "#5C3317";
          const fg = isBreak ? "#93c5fd" : isPaused ? "#c9a98e" : "#F5DEB3";
          wrap.style.background = bg;
          emojiEl.style.color = fg; labelEl.style.color = fg; timeEl.style.color = fg; questEl.style.color = fg; closeBtn.style.color = fg;
          emojiEl.textContent = isBreak ? "☕" : isPaused ? "⏸️" : "💧";
          labelEl.textContent = isBreak ? "Break" : isPaused ? "Paused" : "Dip";
          timeEl.textContent = formatTime(ms);
          questEl.textContent = d.questTitle ?? "";
        } catch { /* ignore */ }
      }
      update();
      pipTickRef.current = setInterval(update, 500);
      pip.addEventListener("unload", () => {
        if (pipTickRef.current) { clearInterval(pipTickRef.current); pipTickRef.current = null; }
        pipWindowRef.current = null;
        setPipOpen(false);
      });
    } catch { /* blocked or not supported */ }
  }

  if (!dip || pathname === "/pomodoro") return null;

  const isBreak = dip.phase === "break";
  const isPaused = dip.phase === "paused";

  const colorClass = isBreak
    ? "bg-blue-50 border-blue-200 text-blue-800"
    : isPaused
    ? "bg-muted border-border text-muted-foreground"
    : "bg-primary text-primary-foreground border-primary";

  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-50",
        "flex items-center rounded-2xl border shadow-lg overflow-hidden",
        colorClass
      )}
    >
      <Link
        href="/pomodoro"
        className="flex items-center gap-3 px-4 py-3 hover:opacity-90 transition-opacity"
      >
        <span className="text-xl leading-none shrink-0">{isBreak ? "☕" : "💧"}</span>
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest opacity-70 leading-none">
            {isBreak ? "Break" : isPaused ? "Paused" : "Dip"}
          </span>
          <span className="text-xl font-bold tabular-nums leading-none">{formatTime(remaining)}</span>
          {dip.questTitle && (
            <span className="text-[10px] opacity-60 truncate max-w-[140px] leading-none">{dip.questTitle}</span>
          )}
        </div>
      </Link>
      {pipSupported && (
        <button
          type="button"
          onClick={() => openPip().catch(() => {})}
          className="px-3 py-3 border-l border-white/20 hover:bg-white/10 transition-colors text-sm leading-none"
          title={pipOpen ? "Close floating timer" : "Float timer"}
        >
          {pipOpen ? "✕" : "⛶"}
        </button>
      )}
    </div>
  );
}
