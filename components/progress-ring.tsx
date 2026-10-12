"use client";

import { useState } from "react";

interface Props {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  hint?: string;
}

function progressColor(pct: number): string {
  if (pct >= 100) return "#2D6A4F"; // dark forest green — done!
  if (pct >= 71)  return "#6B9E3F"; // darker yellow-green
  if (pct >= 31)  return "#C17F3E"; // amber
  if (pct > 0)    return "#C0513A"; // terracotta — just starting
  return "#E8DDD4";                 // empty track
}

export function ProgressRing({ value, size = 140, strokeWidth = 10, hint }: Props) {
  // ─── DEV ONLY — remove before production ─────────────────────────────────
  const [devValue, setDevValue] = useState<number | null>(null);
  // ─────────────────────────────────────────────────────────────────────────

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, devValue ?? value));
  const offset = circumference - (clampedValue / 100) * circumference;
  const color = progressColor(clampedValue);

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* ─── DEV ONLY — remove before production ───────────────────────── */}
      {process.env.NODE_ENV !== "production" && (
        <div className="fixed top-[244px] right-4 z-[9998] border-2 border-dashed border-orange-400 bg-orange-50 rounded-xl p-3 space-y-1.5 shadow-lg w-52">
          <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">🔧 DEV · Progress Ring Colour</span>
          {([
            [ 15, "🔴 just starting (1–30%)"],
            [ 50, "🟠 mid-progress (31–70%)"],
            [ 85, "🟡 past 70% (71–99%)"],
            [100, "🟢 complete (100%)"],
          ] as [number, string][]).map(([v, label]) => (
            <button
              key={v}
              type="button"
              onClick={() => setDevValue((prev) => prev === v ? null : v)}
              className={`block w-full text-left px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${devValue === v ? "bg-orange-400 text-white" : "bg-orange-200 hover:bg-orange-300 text-orange-900"}`}
            >
              {label}
            </button>
          ))}
          {devValue !== null && (
            <button
              type="button"
              onClick={() => setDevValue(null)}
              className="block w-full text-left px-2 py-0.5 rounded bg-orange-100 hover:bg-orange-200 text-orange-700 text-[11px] font-medium transition-colors border border-orange-300"
            >
              ↩ reset to real progress
            </button>
          )}
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E8DDD4"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.7s ease-out, stroke 0.7s ease-out" }}
        />
      </svg>

      {/* Center label */}
      <div className="absolute">
        <div className="group relative">
          <span className="font-display text-4xl font-bold tabular-nums leading-none cursor-help" style={{ color }}>
            {clampedValue}%
          </span>
          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-44 group-hover:block z-50">
            <div className="bg-foreground text-background text-[10px] leading-snug rounded-lg px-2.5 py-2 text-center shadow-lg">
              {hint ?? "Progress is based on chapter completion. Each chapter counts equally, regardless of quest count."}
            </div>
            <div className="mx-auto mt-0.5 h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
}
