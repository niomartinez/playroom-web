"use client";

import { useEffect, useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import { useDisplayBalance } from "@/lib/use-display-balance";
import { useGame } from "@/lib/game-context";
import { useSessionCut } from "@/lib/session-cut";
import { useIsMobile } from "@/lib/use-mobile";
import { symbolFor, formatBalance } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { useSeatWarn } from "@/lib/use-seat-warn";

const CHIPS = [
  // ₱50 is the smallest chip. A single ₱50 bet is accepted, but a hand must
  // reach the round minimum (₱250) or it's refunded at betting close — and the
  // ×2 toggle lets a ₱50 chip stake ₱100. No sub-50 chips.
  { value: 50, src: "/mobile-assets/chip-50.png" },
  { value: 250, src: "/mobile-assets/chip-250.png" },
  { value: 1250, src: "/mobile-assets/chip-1250.png" },
  { value: 5000, src: "/mobile-assets/chip-5000.png" },
  { value: 25000, src: "/mobile-assets/chip-25000.png" },
  { value: 50000, src: "/mobile-assets/chip-50000.png" },
];

/**
 * Seat-balance warning pulse: cycles the balance number white→red→white while
 * the wallet is in the warning zone (block <= balance < warn). Reduced-motion
 * users get the static red instead of the animation.
 */
const SEAT_WARN_KEYFRAMES = `
@keyframes prg-balance-pulse {
  0%, 100% { color: #ffffff; }
  50% { color: #fb2c36; }
}
@media (prefers-reduced-motion: reduce) {
  [style*="prg-balance-pulse"] { animation: none !important; color: #fb2c36 !important; }
}
`;

export default function BalanceBar() {
  const { balance, currency, selectedChip, setSelectedChip, chipMultiplier, setChipMultiplier, roundStatus, placedBets, cancelPlacedBets } = useGame();
  const isMobile = useIsMobile();
  const t = useT();
  const displayBalance = useDisplayBalance(balance);
  const sessionCut = useSessionCut();
  const isBettingOpen = roundStatus === "betting_open" && !sessionCut;
  const hasPlacedBets = placedBets.length > 0;

  // Seat-balance warning band (block <= balance < warn). Desktop pulses the
  // balance number red and swaps the caption under it for the warning; on
  // mobile the balance itself lives in TableInfoBar, so SeatWarnBubble shows it
  // there instead and this branch shows nothing.
  const { warnLow, text: warnLowText } = useSeatWarn();

  /**
   * Auto-step-down: when the live balance can't cover the current selected
   * chip's STAKED value (chip × the ×2 toggle), snap to the largest chip that
   * is affordable at the current multiplier. If none is affordable, leave the
   * selection alone — placeBet's pre-check blocks the bet anyway. Keyed on
   * chipMultiplier too, so toggling ×2 on re-evaluates affordability.
   */
  useEffect(() => {
    const mult = chipMultiplier || 1;
    if (balance >= selectedChip * mult) return;
    const affordable = CHIPS.filter((c) => c.value * mult <= balance);
    if (affordable.length === 0) return;
    const next = affordable[affordable.length - 1].value; // largest affordable
    if (next !== selectedChip) {
      setSelectedChip(next);
    }
  }, [balance, selectedChip, chipMultiplier, setSelectedChip]);

  // The crawled value is what the player sees; the underlying `balance` is
  // still the canonical number (used for chip affordability checks above).
  // Exact minor units (₱10.61) — never round the wallet balance.
  const formatted = formatBalance(displayBalance, currency);

  // ×2 chip toggle — doubles the selected chip's placed value (₱50 → ₱100).
  const x2On = chipMultiplier === 2;
  const toggleX2 = () => setChipMultiplier(x2On ? 1 : 2);

  if (isMobile) {
    return (
      <div
        style={{
          backgroundColor: "#101828",
          border: "0.8px solid #364153",
          borderRadius: 14,
          padding: `calc(10px * var(--prg-scale, 1))`,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* The old top row held balance + CLEAR BETS. The balance moved to
            TableInfoBar, which left CLEAR BETS marooned alone on a full-width
            row — a big red pill floating above the chips with nothing to
            balance it. Both live controls now sit IN the chip row (Evolution
            keeps UNDO / x2 / DOUBLE inline with the chip for the same reason).

            The low-balance warning used to be the last thing left on that row.
            It is gone too, and lives in SeatWarnBubble, anchored to the strip
            that holds the mobile balance: as an in-flow row it added height the
            moment the balance crossed the band and took it back when it crossed
            out, shifting the pads under the player's thumb mid-round. This card
            is now chip-row-only and its height never changes. */}

        {/* Chip row + ×2 toggle (bigger than the chips).
            space-between (no fixed gap) keeps 6 × 36px chips + the 50px ×2
            control inside a ~360px phone without overflow/scroll. */}
        <div
          data-balance-chips=""
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* CLEAR at the HEAD of the row, ×2 at the tail — the two actions
              bracket the denominations instead of competing with them. Both are
              deliberately smaller than a chip (42 vs 50): they are occasional
              controls, while the chips are what a thumb has to hit accurately.

              ALWAYS rendered, only disabled. Showing/hiding it re-flowed the
              whole chip row every time betting opened or closed, so the
              denominations shifted under the player's thumb mid-tap. */}
          <button
              type="button"
              onClick={cancelPlacedBets}
              disabled={!isBettingOpen || !hasPlacedBets}
              aria-label={t("balance.clearBets")}
              title={t("balance.clearBets")}
              style={{
                width: `calc(42px * var(--prg-scale, 1))`,
                height: `calc(42px * var(--prg-scale, 1))`,
                flexShrink: 0,
                borderRadius: 14,
                border: `1.6px solid ${hasPlacedBets ? "rgba(251,44,54,0.85)" : "rgba(255,255,255,0.18)"}`,
                background: hasPlacedBets ? "rgba(251,44,54,0.16)" : "rgba(255,255,255,0.04)",
                color: hasPlacedBets ? "#ff6467" : "rgba(255,255,255,0.4)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                cursor: hasPlacedBets ? "pointer" : "not-allowed",
                padding: 0,
                transition: "all 0.15s ease",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {/* Lucide's Undo2 — a real icon from a real set, rather than SVG
                  paths hand-drawn here. Reads as "take it back", which is what
                  this does, and stays legible at 17px where my earlier attempts
                  did not. */}
              <Undo2 size={17} strokeWidth={2.1} />
              <span style={{ fontSize: 6.5, fontWeight: 800, letterSpacing: 0.3 }}>
                {t("balance.clear")}
              </span>
            </button>

          {CHIPS.map((chip) => {
            const isSelected = selectedChip === chip.value;
            const isDisabled = balance < chip.value * (chipMultiplier || 1);
            return (
              <button
                key={chip.value}
                data-chip-denom={chip.value}
                data-sfx="chip"
                onClick={() => {
                  if (isDisabled) return;
                  setSelectedChip(chip.value);
                }}
                disabled={isDisabled}
                style={{
                  width: `calc(36px * var(--prg-scale, 1))`,
                  height: `calc(36px * var(--prg-scale, 1))`,
                  borderRadius: "50%",
                  backgroundColor: "transparent",
                  border: "none",
                  transform: isSelected ? "scale(1.18)" : "scale(1)",
                  transformOrigin: "center center",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, filter 0.15s ease",
                  boxShadow: isSelected
                    ? "0 0 0 2px rgba(255,255,255,0.85), 0 0 18px rgba(255,255,255,0.65)"
                    : "0 1px 3px rgba(0,0,0,0.3)",
                  cursor: isDisabled ? "not-allowed" : "pointer",
                  padding: 0,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: isSelected ? 2 : 1,
                  opacity: isDisabled ? 0.4 : 1,
                  filter: isDisabled ? "grayscale(1)" : "none",
                }}
                aria-label={t("balance.chipAria", { amount: `${symbolFor(currency)}${chip.value.toLocaleString()}` })}
                aria-disabled={isDisabled}
              >
                <img
                  src={chip.src}
                  alt={`${chip.value} chip`}
                  style={{
                    width: `calc(36px * var(--prg-scale, 1))`,
                    height: `calc(36px * var(--prg-scale, 1))`,
                    display: "block",
                    borderRadius: "50%",
                    pointerEvents: "none",
                  }}
                />
              </button>
            );
          })}

          {/* ×2 toggle — matches CLEAR at 42 so both read as controls rather
              than denominations, and neither steals width from the chips. */}
          <button
            type="button"
            onClick={toggleX2}
            aria-pressed={x2On}
            aria-label="Double the selected chip"
            style={{
              width: `calc(42px * var(--prg-scale, 1))`,
              height: `calc(42px * var(--prg-scale, 1))`,
              flexShrink: 0,
              borderRadius: 14,
              border: x2On ? "1.6px solid #f0b100" : "1.6px solid rgba(255,255,255,0.18)",
              background: x2On
                ? "linear-gradient(160deg, #ffd24d 0%, #d08700 100%)"
                : "rgba(255,255,255,0.04)",
              color: x2On ? "#3a2600" : "rgba(255,255,255,0.72)",
              fontSize: `calc(16px * var(--prg-scale, 1))`,
              fontWeight: 900,
              letterSpacing: 0.2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
              transform: x2On ? "scale(1.06)" : "scale(1)",
              boxShadow: x2On
                ? "0 0 0 2px rgba(240,177,0,0.35), 0 0 16px rgba(240,177,0,0.55)"
                : "0 1px 3px rgba(0,0,0,0.3)",
              transition: "all 0.15s ease",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            ×2
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full"
      style={{
        // Grid, not flex+justify-between, because of `minmax(0, 1fr)`: that
        // track's MINIMUM is 0, so the balance region is sized by whatever
        // width is LEFT OVER and never by its own content. A long warning
        // string (zh-Hans is wider than en) therefore cannot add width to the
        // row — which is exactly how it used to shove CLEAR BETS and the whole
        // chip row past the panel's overflow-hidden edge. The trailing `auto`
        // tracks keep those two at their content width, and the 1fr absorbs the
        // slack `justify-between` used to spread between the groups.
        //
        // Track COUNT must match the children: CLEAR BETS is only rendered
        // while betting is open. Add or remove a child here without updating
        // this template and the grid invents an implicit column, landing the
        // chips somewhere unrelated (same failure as the explicit row template
        // in PlayerLayout). Never add justify-content — that would restore
        // content-driven sizing and with it the bug.
        display: "grid",
        gridTemplateColumns: isBettingOpen
          ? "minmax(0, 1fr) auto auto"
          : "minmax(0, 1fr) auto",
        alignItems: "center",
        backgroundColor: "#101828",
        border: "0.8px solid #364153",
        borderRadius: "0.7vw",
        padding: "0.6vh 1vw",
        gap: "0.5vw",
      }}
    >
      {/* minWidth 0: a grid item defaults to min-width:auto, which would let
          this group PAINT out of its track even though it can no longer widen
          it. */}
      <div className="flex items-center" style={{ gap: "0.7vw", minWidth: 0 }}>
        <img
          src="/mobile-assets/balance-icon.png"
          alt={t("balance.label")}
          className="flex-shrink-0"
          style={{ width: "clamp(28px, 3.4vh, 48px)", height: "clamp(28px, 3.4vh, 48px)" }}
        />
        <style>{SEAT_WARN_KEYFRAMES}</style>
        <div style={{ minWidth: 0 }}>
          {/* The warning sits UNDER the amount, in the caption's line — never
              beside it. This bar is h-full inside a fixed grid row and cannot
              grow, so the block has to be exactly two lines in every state: a
              third line pushed the warning onto — and past — the bottom border.
              Taking the caption's line instead of adding one is what lets the
              warning live below the figure at all. Only one of the two strings
              is on screen at a time; while the warning shows, the balance icon
              carries the "this is your balance" meaning. */}
          <div
            className="font-bold text-white"
            style={{
              fontSize: "clamp(18px, 2.4vh, 30px)",
              fontVariantNumeric: "tabular-nums",
              fontFeatureSettings: '"tnum"',
              // The 1fr track stops the figure WIDENING the row; these stop a
              // freak long balance PAINTING over CLEAR BETS inside it.
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              ...(warnLow ? { animation: "prg-balance-pulse 1.2s ease-in-out infinite" } : null),
            }}
          >
            {formatted}
          </div>
          <div
            {...(warnLow ? { role: "status", "data-seat-warn": "", title: warnLowText } : null)}
            style={{
              fontSize: warnLow ? "clamp(9px, 1.15vh, 13px)" : "clamp(11px, 1.4vh, 16px)",
              // Fixed line box, so swapping the caption for the warning cannot
              // change the block's height even though the two differ in size.
              lineHeight: "clamp(14px, 1.8vh, 20px)",
              fontWeight: warnLow ? 600 : 400,
              color: warnLow ? "#fb2c36" : "#99a1af",
              opacity: warnLow ? 0.9 : 1,
              // Truncate rather than wrap — a second caption line is the third
              // line the bar has no room for. The 1fr track is the width bound
              // now (no maxWidth band-aid needed); full text is on hover.
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {warnLow ? warnLowText : t("balance.label")}
          </div>
        </div>
      </div>

      {isBettingOpen && (
        <button
          onClick={cancelPlacedBets}
          disabled={!hasPlacedBets}
          className="flex-shrink-0"
          style={{
            padding: "0.4vh 1vw",
            borderRadius: 999,
            background: hasPlacedBets ? "rgba(251,44,54,0.92)" : "rgba(20,24,34,0.85)",
            border: `1.5px solid ${hasPlacedBets ? "#fb2c36" : "rgba(255,255,255,0.18)"}`,
            color: hasPlacedBets ? "#fff" : "rgba(255,255,255,0.5)",
            fontSize: "clamp(9px, 1vh, 12px)",
            fontWeight: 800,
            letterSpacing: 0.6,
            cursor: hasPlacedBets ? "pointer" : "not-allowed",
            boxShadow: hasPlacedBets
              ? "0 2px 8px rgba(251,44,54,0.35)"
              : "none",
            transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
            whiteSpace: "nowrap",
          }}
        >
          {t("balance.clearBets")}
        </button>
      )}

      {/* Chip icons */}
      <div data-balance-chips="" className="flex items-center" style={{ gap: "0.5vw" }}>
        {CHIPS.map((chip) => {
          const isSelected = selectedChip === chip.value;
          const isDisabled = balance < chip.value * (chipMultiplier || 1);
          return (
            <button
              key={chip.value}
              data-chip-denom={chip.value}
              data-sfx="chip"
              onClick={() => {
                if (isDisabled) return;
                setSelectedChip(chip.value);
              }}
              disabled={isDisabled}
              className="rounded-full flex items-center justify-center"
              style={{
                width: "clamp(32px, 3.6vh, 48px)",
                height: "clamp(32px, 3.6vh, 48px)",
                backgroundColor: "transparent",
                border: "none",
                padding: 0,
                transform: isSelected ? "scale(1.18)" : "scale(1)",
                transformOrigin: "center center",
                transition: "transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease, filter 0.15s ease",
                boxShadow: isSelected
                  ? "0 0 0 2px rgba(255,255,255,0.85), 0 0 18px rgba(255,255,255,0.65)"
                  : "0 1px 3px rgba(0,0,0,0.3)",
                zIndex: isSelected ? 2 : 1,
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.4 : 1,
                filter: isDisabled ? "grayscale(1)" : "none",
              }}
              aria-label={t("balance.chipAria", { amount: `${symbolFor(currency)}${chip.value.toLocaleString()}` })}
              aria-disabled={isDisabled}
            >
              <img
                src={chip.src}
                alt={`${chip.value} chip`}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  borderRadius: "50%",
                  pointerEvents: "none",
                }}
              />
            </button>
          );
        })}

        {/* ×2 toggle — larger than a chip so it reads as a control. */}
        <button
          type="button"
          onClick={toggleX2}
          aria-pressed={x2On}
          aria-label="Double the selected chip"
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: "clamp(40px, 4.6vh, 60px)",
            height: "clamp(40px, 4.6vh, 60px)",
            borderRadius: "0.5vw",
            border: x2On ? "1.6px solid #f0b100" : "1.6px solid rgba(255,255,255,0.18)",
            background: x2On
              ? "linear-gradient(160deg, #ffd24d 0%, #d08700 100%)"
              : "rgba(255,255,255,0.04)",
            color: x2On ? "#3a2600" : "rgba(255,255,255,0.72)",
            fontSize: "clamp(14px, 1.8vh, 22px)",
            fontWeight: 900,
            cursor: "pointer",
            padding: 0,
            transform: x2On ? "scale(1.06)" : "scale(1)",
            boxShadow: x2On
              ? "0 0 0 2px rgba(240,177,0,0.35), 0 0 16px rgba(240,177,0,0.55)"
              : "0 1px 3px rgba(0,0,0,0.3)",
            transition: "all 0.15s ease",
          }}
        >
          ×2
        </button>
      </div>
    </div>
  );
}
