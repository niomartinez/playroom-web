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
 * Disabled buttons are silent — a refused action must not sound like an
 * accepted one.
 *
 * Per-button behaviour, resolved from the nearest ancestor `<button>`:
 *   - `data-sfx="off"`   → silent (opt-out).
 *   - `data-sfx="press"`    → the heavier `press` sound.
 *   - `data-sfx="chip"`     → chip-select sample (denomination picker).
 *   - `data-sfx="betPlace"` → a RANDOM chip-on-felt sample (placing a bet). One
 *                             fixed sample reads as a UI beep when tapped
 *                             repeatedly; rotating keeps a run of bets physical.
 *   - anything else         → the default `click` sound.
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

      // Never sound a control that can't be used. Tapping PLAYER while you
      // already have money on BANKER is refused, but it still played the
      // chip-on-felt sample — which tells the player the opposite of what
      // happened. Engines differ on whether a disabled button (or a child of
      // one) dispatches pointer events at all, so this is checked here rather
      // than relied upon.
      if (
        (btn as HTMLButtonElement).disabled ||
        btn.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }

      const mode = btn.getAttribute("data-sfx");
      if (mode === "off") return;
      if (mode === "press" || mode === "chip" || mode === "betPlace") {
        buttonSfx.play(mode);
        return;
      }
      buttonSfx.play("click");
    };

    // Capture phase so stopPropagation on the button can't swallow the sound.
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
  }, []);

  return <>{children}</>;
}
