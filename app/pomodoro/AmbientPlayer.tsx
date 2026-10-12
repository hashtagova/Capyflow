"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

type SoundOption = "rain" | "cafe" | "forest" | "lofi" | "none";

const SOUNDS: { id: SoundOption; emoji: string; label: string }[] = [
  { id: "rain",   emoji: "🌧️", label: "Rain"   },
  { id: "cafe",   emoji: "☕",  label: "Café"   },
  { id: "forest", emoji: "🌿", label: "Forest" },
  { id: "lofi",   emoji: "🎵", label: "Lo-fi"  },
  { id: "none",   emoji: "🔇", label: "None"   },
];

const SOUND_URLS: Record<SoundOption, string> = {
  rain:   "/sounds/rain%20ambience%20loop_dragon-studio-copyright-free-rain-sounds-331497.mp3",
  cafe:   "/sounds/cafe%20ambience_km007-cafe-ambience-9263.mp3",
  forest: "/sounds/forest_u_7hpxkdroz2-forest-461593.mp3",
  lofi:   "/sounds/lo-fi_shidenbeatsmusic-loop-file-jazz-waltz-34-beat-bpm132-144689.mp3",
  none:   "",
};

export function AmbientPlayer() {
  const [selected, setSelected] = useState<SoundOption>(() => {
    try {
      return (localStorage.getItem("capyflow_ambient") as SoundOption) ?? "none";
    } catch {
      return "none";
    }
  });

  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const isInitialMount = useRef(true);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  }, []);

  const playSound = useCallback((sound: SoundOption) => {
    stopSound();
    if (sound === "none") return;
    const audio = new Audio(SOUND_URLS[sound]);
    audio.loop   = true;
    audio.volume = 0.3;
    audio.play().catch(() => {});
    audioRef.current = audio;
  }, [stopSound]);

  // Stop when component unmounts (session ends)
  useEffect(() => () => stopSound(), [stopSound]);

  // Play/stop when selection changes; skip auto-play on first render
  useEffect(() => {
    if (isInitialMount.current) { isInitialMount.current = false; return; }
    if (selected === "none") stopSound();
    else playSound(selected);
  }, [selected, playSound, stopSound]);

  function handleSelect(sound: SoundOption) {
    const next: SoundOption = sound !== "none" && selected === sound ? "none" : sound;
    setSelected(next);
    try { localStorage.setItem("capyflow_ambient", next); } catch {}
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap justify-center">
      {SOUNDS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => handleSelect(s.id)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            selected === s.id
              ? "border-primary bg-accent text-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          <span>{s.emoji}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}
