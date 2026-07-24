"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/game-context";
import { useIsMobile } from "@/lib/use-mobile";
import { symbolFor, formatBalance, formatMoney } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { resolveMinSeatBalance } from "@/lib/min-seat-balance";

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

/** Post-settlement odometer crawl on the balance number (wins + losses). */
const BALANCE_CRAWL_DURATION_MS = 1500;
/** Quick tick for small balance changes (e.g. placing a chip). */
const BALANCE_CRAWL_FAST_DURATION_MS = 300;
/** Above this delta, we treat the change as "settlement-sized" -> long crawl. */
const BALANCE_CRAWL_FAST_THRESHOLD = 1000;

/**
 * Smoothly animates a `displayed` balance toward the live `target` balance.
 * Uses requestAnimationFrame interpolation. Picks a longer duration for
 * settlement-sized changes (>$1k) and a fast tick for chip-sized changes
 * so individual bet placements feel snappy.
 */
function useDisplayBalance(target: number): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef(0);
  const durationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const hasInitRef = useRef(false);

  useEffect(() => {
    // First non-zero target: snap, don't animate. The GameContext balance
    // starts at 0 and gets populated by the balance WS later — we don't want
    // a 1.5s odometer crawl from $0 -> balance on initial page load.
    if (!hasInitRef.current && target !== 0) {
      hasInitRef.current = true;
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    // First mount: snap immediately.
    if (display === target && fromRef.current === target) return;

    const delta = Math.abs(target - display);
    const duration =
      delta >= BALANCE_CRAWL_FAST_THRESHOLD
        ? BALANCE_CRAWL_DURATION_MS
        : BALANCE_CRAWL_FAST_DURATION_MS;

    fromRef.current = display;
    startRef.current = performance.now();
    durationRef.current = duration;

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const t = Math.min(1, elapsed / durationRef.current);
      // ease-out cubic — feels good for an odometer
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (target - fromRef.current) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(target);
        rafRef.current = null;
      }
    };

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return display;
}

export default function BalanceBar() {
  const { balance, balanceLoaded, currency, selectedChip, setSelectedChip, chipMultiplier, setChipMultiplier, roundStatus, placedBets, cancelPlacedBets, token, minSeatBalance } = useGame();
  const isMobile = useIsMobile();
  const t = useT();
  const displayBalance = useDisplayBalance(balance);
  const isBettingOpen = roundStatus === "betting_open";
  const hasPlacedBets = placedBets.length > 0;

  /**
   * Seat-balance warning zone: block <= balance < warn. The balance is above
   * the seat floor (else SeatBalanceGate would cover the screen) but close
   * enough that we nudge the player before it drops through. Pulses the
   * balance number red + shows a small, low-opacity, non-obstructive hint.
   */
  const { block, warn } = resolveMinSeatBalance(minSeatBalance);
  const warnLow =
    token !== "demo" &&
    balanceLoaded &&
    minSeatBalance != null &&
    balance >= block &&
    balance < warn;
  const warnLowText = t("seat.warnLow", { amount: formatMoney(block, currency) });

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
          padding: 10,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <style>{SEAT_WARN_KEYFRAMES}</style>
        {/* Top section: balance (left) + CLEAR BETS (right, opposite the
            balance) — sits above the chips so the two live controls bracket
            the row. */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <img
              src="/mobile-assets/balance-icon.png"
              alt={t("balance.label")}
              style={{ width: 16, height: 16, flexShrink: 0 }}
            />
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 400, color: "#99A1AF" }}>
                {t("balance.label")}
              </span>
              <span
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  fontFeatureSettings: '"tnum"',
                  ...(warnLow ? { animation: "prg-balance-pulse 1.2s ease-in-out infinite" } : null),
                }}
              >
                {formatted}
              </span>
            </div>
          </div>
          {isBettingOpen && (
            <button
              onClick={cancelPlacedBets}
              disabled={!hasPlacedBets}
              style={{
                flexShrink: 0,
                padding: "5px 12px",
                borderRadius: 999,
                background: hasPlacedBets ? "rgba(251,44,54,0.92)" : "rgba(20,24,34,0.85)",
                border: `1.4px solid ${hasPlacedBets ? "#fb2c36" : "rgba(255,255,255,0.18)"}`,
                color: hasPlacedBets ? "#fff" : "rgba(255,255,255,0.5)",
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: 0.6,
                cursor: hasPlacedBets ? "pointer" : "not-allowed",
                boxShadow: hasPlacedBets ? "0 2px 8px rgba(251,44,54,0.35)" : "none",
                whiteSpace: "nowrap",
                transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {t("balance.clearBets")}
            </button>
          )}
          {warnLow && (
            <span
              role="status"
              style={{
                fontSize: 9,
                fontWeight: 600,
                color: "#fb2c36",
                opacity: 0.6,
                lineHeight: 1.2,
                flexBasis: "100%",
              }}
            >
              {warnLowText}
            </span>
          )}
        </div>

        {/* Bottom section: chip row + ×2 toggle (bigger than the chips).
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
          {CHIPS.map((chip) => {
            const isSelected = selectedChip === chip.value;
            const isDisabled = balance < chip.value * (chipMultiplier || 1);
            return (
              <button
                key={chip.value}
                data-chip-denom={chip.value}
                onClick={() => {
                  if (isDisabled) return;
                  setSelectedChip(chip.value);
                }}
                disabled={isDisabled}
                style={{
                  width: 36,
                  height: 36,
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
                    width: 36,
                    height: 36,
                    display: "block",
                    borderRadius: "50%",
                    pointerEvents: "none",
                  }}
                />
              </button>
            );
          })}

          {/* ×2 toggle — deliberately larger than a chip so it reads as a
              distinct control, not another denomination. */}
          <button
            type="button"
            onClick={toggleX2}
            aria-pressed={x2On}
            aria-label="Double the selected chip"
            style={{
              width: 50,
              height: 50,
              flexShrink: 0,
              borderRadius: 14,
              border: x2On ? "1.6px solid #f0b100" : "1.6px solid rgba(255,255,255,0.18)",
              background: x2On
                ? "linear-gradient(160deg, #ffd24d 0%, #d08700 100%)"
                : "rgba(255,255,255,0.04)",
              color: x2On ? "#3a2600" : "rgba(255,255,255,0.72)",
              fontSize: 16,
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
      className="flex items-center justify-between h-full"
      style={{
        backgroundColor: "#101828",
        border: "0.8px solid #364153",
        borderRadius: "0.7vw",
        padding: "0.6vh 1vw",
        gap: "0.5vw",
      }}
    >
      <div className="flex items-center flex-shrink-0" style={{ gap: "0.7vw" }}>
        <img
          src="/mobile-assets/balance-icon.png"
          alt={t("balance.label")}
          className="flex-shrink-0"
          style={{ width: "clamp(28px, 3.4vh, 48px)", height: "clamp(28px, 3.4vh, 48px)" }}
        />
        <style>{SEAT_WARN_KEYFRAMES}</style>
        <div>
          <div className="text-[#99a1af]" style={{ fontSize: "clamp(11px, 1.4vh, 16px)" }}>{t("balance.label")}</div>
          <div
            className="font-bold text-white"
            style={{
              fontSize: "clamp(18px, 2.4vh, 30px)",
              fontVariantNumeric: "tabular-nums",
              fontFeatureSettings: '"tnum"',
              ...(warnLow ? { animation: "prg-balance-pulse 1.2s ease-in-out infinite" } : null),
            }}
          >
            {formatted}
          </div>
          {warnLow && (
            <div
              role="status"
              style={{
                fontSize: "clamp(8px, 1vh, 11px)",
                fontWeight: 600,
                color: "#fb2c36",
                opacity: 0.6,
                lineHeight: 1.2,
                marginTop: 2,
                maxWidth: "16vw",
              }}
            >
              {warnLowText}
            </div>
          )}
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
          const isDisabled = balance < chip.value;
          return (
            <button
              key={chip.value}
              data-chip-denom={chip.value}
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
