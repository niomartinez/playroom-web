"use client";

import { useEffect, type ReactNode } from "react";
import { buttonSfx } from "./audio/button-sfx";

/**
 * Global button-click SFX provider (player UI only).
 *
 * Installs ONE capture-phase `pointerdown` listener on `document`. Capture
 * phase means it fires before any element's own handler can `stopPropagation`,
 * so a click sound is guaranteed for every button regardless of what its
 * onClick does.
 *
 * Per-button behaviour, resolved from the nearest ancestor `<button>`:
 *   - `data-sfx="off"`   → silent (opt-out).
 *   - `data-sfx="press"` → the heavier `press` sound (primary bet/confirm).
 *   - anything else      → the default `click` sound.
 *
 * The same gesture also unlocks Web Audio (iOS needs the context created +
 * a silent buffer started inside a real gesture). Muting is handled inside
 * the singleton (persisted to localStorage, default-on).
 *
 * NOTE: player root only — do NOT mount this in the studio tree.
 */
export default function ButtonSfxProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      // Unlock on the first (and every) gesture — cheap no-op once running.
      buttonSfx.unlock();

      const target = e.target as Element | null;
      const btn = target?.closest?.("button");
      if (!btn) return;

      const mode = btn.getAttribute("data-sfx");
      if (mode === "off") return;
      buttonSfx.play(mode === "press" ? "press" : "click");
    };

    // Capture phase so stopPropagation on the button can't swallow the sound.
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, []);

  return <>{children}</>;
}
