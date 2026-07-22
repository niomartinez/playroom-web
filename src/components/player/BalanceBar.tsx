"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/game-context";
import { useIsMobile } from "@/lib/use-mobile";
import { symbolFor, formatBalance, formatMoney } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import { resolveMinSeatBalance } from "@/lib/min-seat-balance";

const CHIPS = [
  // ₱250 is the smallest chip — the table minimum. No sub-250 chips.
  { value: 250, src: "/mobile-assets/chip-250.png" },
  { value: 500, src: "/mobile-assets/chip-500.png" },
  { value: 1000, src: "/mobile-assets/chip-1000.png" },
  { value: 5000, src: "/mobile-assets/chip-5000.png" },
  { value: 25000, src: "/mobile-assets/chip-25000.png" },
  { value: 100000, src: "/mobile-assets/chip-100000.png" },
  { value: 500000, src: "/mobile-assets/chip-500000.png" },
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
  const { balance, balanceLoaded, currency, selectedChip, setSelectedChip, roundStatus, placedBets, cancelPlacedBets, token, minSeatBalance } = useGame();
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
   * Auto-step-down: when the live balance drops below the current selected
   * chip, snap to the largest affordable chip. If no chip is affordable,
   * leave the selection alone — placeBet's pre-check blocks the bet anyway.
   */
  useEffect(() => {
    if (balance >= selectedChip) return;
    const affordable = CHIPS.filter((c) => c.value <= balance);
    if (affordable.length === 0) return;
    const next = affordable[affordable.length - 1].value; // largest affordable
    if (next !== selectedChip) {
      setSelectedChip(next);
    }
  }, [balance, selectedChip, setSelectedChip]);

  // The crawled value is what the player sees; the underlying `balance` is
  // still the canonical number (used for chip affordability checks above).
  // Exact minor units (₱10.61) — never round the wallet balance.
  const formatted = formatBalance(displayBalance, currency);

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
        {/* Top section: icon + balance — compact, single row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
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

        {/* Bottom section: chip row */}
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
                style={{
                  width: 38,
                  height: 38,
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
                    width: 38,
                    height: 38,
                    display: "block",
                    borderRadius: "50%",
                    pointerEvents: "none",
                  }}
                />
              </button>
            );
          })}
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
      </div>
    </div>
  );
}
