"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "@/lib/language-context";

export function MomentumTooltip() {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  function measure() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.left + rect.width / 2 });
  }

  function openTooltip() {
    measure();
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="How is this score calculated?"
        onMouseEnter={openTooltip}
        onMouseLeave={() => setOpen(false)}
        onClick={() => (open ? setOpen(false) : openTooltip())}
        className="w-4 h-4 rounded-full border border-muted-foreground/40 text-muted-foreground/60 text-[9px] font-semibold leading-none flex items-center justify-center hover:border-muted-foreground/70 hover:text-muted-foreground transition-colors shrink-0"
      >
        ?
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            transform: "translateX(-50%) translateY(calc(-100% - 10px))",
            zIndex: 9999,
            pointerEvents: "none",
            width: "248px",
          }}
        >
          <div
            style={{
              backgroundColor: "#faf8f4",
              border: "1px solid rgba(92,51,23,0.15)",
              borderRadius: "10px",
              boxShadow: "0 4px 16px rgba(92,51,23,0.12)",
              padding: "10px 12px",
            }}
          >
            <p style={{ color: "#5C3317", fontSize: "11px", fontWeight: 600, marginBottom: "5px" }}>
              {t.momentumTooltipTitle}
            </p>
            <p style={{ color: "#a09080", fontSize: "11px" }}>
              {t.momentumTooltipFooter}
            </p>
          </div>

          {/* Arrow pointing down toward the button */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{
              width: "8px",
              height: "8px",
              backgroundColor: "#faf8f4",
              border: "1px solid rgba(92,51,23,0.15)",
              borderTop: "none",
              borderLeft: "none",
              transform: "rotate(45deg)",
              marginTop: "-4px",
            }} />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
