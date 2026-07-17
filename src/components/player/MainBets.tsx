"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useBetting } from "@/lib/use-betting";
import { useGame, type BetCode } from "@/lib/game-context";
import { useIsMobile } from "@/lib/use-mobile";
import { dispatchChipFly } from "@/lib/chip-fly";
import { symbolFor } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import BetStackedChips from "./BetStackedChips";
import { useToast } from "@/lib/toast-context";

const BETS: Array<{
  name: string;
  nameKey: string;
  abbrev: string;
  betCode: BetCode;
  gradient: string;
  border: string;
  mobileGradient: string;
  mobileBorder: string;
}> = [
  {
    name: "PLAYER",
    nameKey: "bet.player",
    abbrev: "P",
    betCode: "BAC_Player",
    gradient: "linear-gradient(154deg, rgb(0,101,255) 0%, rgb(0,21,86) 100%)",
    border: "rgba(43,127,255,0.5)",
    mobileGradient: "linear-gradient(126.5deg, #0065FF 0%, #001556 100%)",
    mobileBorder: "rgba(43,127,255,0.5)",
  },
  {
    name: "TIE",
    nameKey: "bet.tie",
    abbrev: "T",
    betCode: "BAC_Tie",
    gradient: "linear-gradient(154deg, rgb(58,161,40) 0%, rgb(0,86,16) 100%)",
    border: "rgba(0,201,80,0.5)",
    mobileGradient: "linear-gradient(126.5deg, #3AA128 0%, #005610 100%)",
    mobileBorder: "rgba(0,201,80,0.5)",
  },
  {
    name: "BANKER",
    nameKey: "bet.banker",
    abbrev: "B",
    betCode: "BAC_Banker",
    gradient: "linear-gradient(154deg, rgb(217,62,64) 0%, rgb(86,0,9) 100%)",
    border: "rgba(251,44,54,0.5)",
    mobileGradient: "linear-gradient(126.5deg, #D93E40 0%, #560009 100%)",
    mobileBorder: "rgba(251,44,54,0.5)",
  },
];

function formatCompact(amount: number, symbol: string): string {
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)}M`;
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 0)}K`;
  return `${symbol}${amount}`;
}

// Map a UI bet code to the bucket key used in MainBetCounts payloads.
const COUNTS_KEY: Record<BetCode, "Player" | "Tie" | "Banker" | null> = {
  BAC_Player: "Player",
  BAC_Tie:    "Tie",
  BAC_Banker: "Banker",
  BAC_PlayerPair: null,
  BAC_BankerPair: null,
  BAC_EitherPair: null,
  BAC_PerfectPair: null,
};

/** #2 — only the three main bets are draggable/droppable. */
const MAIN_CODES = new Set<BetCode>(["BAC_Player", "BAC_Tie", "BAC_Banker"]);

export default function MainBets() {
  const { placeBet, moveMainBet, isBettingOpen, isOpposingBlocked, placedBets, selectedChip } = useBetting();
  const { toast } = useToast();
  const { roundStatus, balance, currency, addFlyingChip, mainBetCounts, currentRound, stackedChips } = useGame();
  const isMobile = useIsMobile();
  const t = useT();
  const sym = symbolFor(currency);

  // Drag ghost sizing. Chips overlap into a stack rather than sitting in a
  // row so the whole thing stays thumb-sized while dragging.
  const DRAG_CHIP_SIZE = 40;
  /** Vertical gap between chips in the carried stack. */
  const DRAG_CHIP_STAGGER = 7;
  /** How far above the finger the stack rides, so it isn't under the thumb. */
  const DRAG_LIFT = 26;
  /** How long a chip takes to reach the cursor — this lag IS the weight. */
  const DRAG_FOLLOW_MS = 90;
  /** Each chip up the stack lags a little more, so the stack flexes. */
  const DRAG_FOLLOW_STAGGER_MS = 45;
  /** How long the chips take to settle into the pad after you let go. */
  const DRAG_LAND_MS = 260;

  // #2 — drag-to-move a placed main bet to another main pad.
  const [drag, setDrag] = useState<{
    from: BetCode;
    x: number;
    y: number;
    over: BetCode | null;
    /**
     * Denominations under the finger, snapshotted when the drag starts.
     * Deliberately NOT read live off stackedChips: the move is optimistic, so
     * the source pad is already empty by the time the landing animation runs
     * and the ghost would render as nothing mid-flight.
     */
    denoms: number[];
    /** Set on drop: the ghost is gliding into the target pad, not tracking a finger. */
    landing?: boolean;
  } | null>(null);
  const dragStartRef = useRef<{
    from: BetCode;
    x: number;
    y: number;
    active: boolean;
    /** Where the chips physically sit on the pad — the stack lifts from here. */
    originX: number;
    originY: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  /**
   * The real denominations sitting on a pad, highest first — the same set
   * BetStackedChips draws on the button, so what you pick up looks like what
   * was there. The ghost used to be a generic gold disc with a right-arrow
   * glyph in it, which read as a cursor rather than as the player's money.
   */
  const padDenoms = (code: BetCode): number[] =>
    Array.from(new Set((stackedChips[code] ?? []).map((c) => c.denom)))
      .sort((a, b) => b - a)
      .slice(0, 3);

  const findPadCode = (x: number, y: number): BetCode | null => {
    if (typeof document === "undefined") return null;
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const pad = el?.closest("[data-bet-code]") as HTMLElement | null;
    const code = pad?.getAttribute("data-bet-code") as BetCode | null;
    return code && MAIN_CODES.has(code) ? code : null;
  };

  const onPadPointerDown = (betCode: BetCode, e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!isBettingOpen) return;
    const myTotal = placedBets.filter((b) => b.betCode === betCode).reduce((s, b) => s + b.amount, 0);
    if (myTotal <= 0) return; // nothing to drag — leave it a normal tap
    // Lift from where the chips actually are, not from the fingertip: the
    // stack should look picked UP off the felt rather than conjured under
    // the cursor.
    const chipsEl = e.currentTarget.querySelector("[data-stacked-chips]") as HTMLElement | null;
    const cr = (chipsEl ?? e.currentTarget).getBoundingClientRect();
    dragStartRef.current = {
      from: betCode,
      x: e.clientX,
      y: e.clientY,
      active: false,
      originX: cr.left + cr.width / 2,
      originY: cr.top + cr.height / 2,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPadPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const st = dragStartRef.current;
    if (!st) return;
    if (!st.active && Math.hypot(e.clientX - st.x, e.clientY - st.y) < 8) return;
    const justStarted = !st.active;
    st.active = true;
    const over = findPadCode(e.clientX, e.clientY);
    const nextOver = over && over !== st.from ? over : null;

    if (justStarted) {
      // First frame: park the stack on the pad. The very next frame moves it
      // to the cursor, and because position is transitioned the chips visibly
      // lift off the felt and fly to the hand instead of teleporting.
      const denoms = padDenoms(st.from);
      setDrag({ from: st.from, x: st.originX, y: st.originY, over: nextOver, denoms });
      const { clientX, clientY } = e;
      requestAnimationFrame(() =>
        setDrag((prev) => (prev ? { ...prev, x: clientX, y: clientY } : prev)),
      );
      return;
    }
    setDrag((prev) => ({
      from: st.from,
      x: e.clientX,
      y: e.clientY,
      over: nextOver,
      denoms: prev?.denoms ?? padDenoms(st.from),
    }));
  };

  const onPadPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const st = dragStartRef.current;
    dragStartRef.current = null;
    if (!st || !st.active) {
      setDrag(null);
      return;
    }
    // It was a drag, not a tap — swallow the click the browser fires next.
    // Self-clear on the following macrotask (the trailing click dispatches
    // before it): the flag is only otherwise consumed by handleBet, and a
    // Player<->Banker move can leave the source pad disabled by the opposing-
    // bet rule, so no click ever arrives and the flag would strand — eating
    // the player's next real tap on any pad.
    suppressClickRef.current = true;
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    const over = findPadCode(e.clientX, e.clientY);

    if (over && over !== st.from) {
      // Glide the chips into the pad rather than blinking them out of
      // existence at the fingertip. Re-target the same ghost at the pad's
      // centre and let CSS carry it there; the pad's own BetStackedChips
      // have already appeared underneath (the move is optimistic), so the
      // landing reads as the stack settling onto the felt.
      const padEl =
        typeof document !== "undefined"
          ? (document.querySelector(`[data-bet-code="${over}"]`) as HTMLElement | null)
          : null;
      const r = padEl?.getBoundingClientRect();
      if (r) {
        setDrag((prev) => ({
          from: st.from,
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          over,
          denoms: prev?.denoms ?? padDenoms(st.from),
          landing: true,
        }));
        window.setTimeout(() => setDrag(null), DRAG_LAND_MS);
      } else {
        setDrag(null);
      }

      // Tell the player when the move is refused. This result used to be
      // discarded, so a rejected drag was indistinguishable from a missed
      // one: the chips snapped back and nothing said why.
      void moveMainBet(st.from, over).then((res) => {
        if (!res.success && res.error) toast({ type: "error", message: res.error });
      });
    } else {
      setDrag(null);
    }
  };

  const onPadPointerCancel = () => {
    dragStartRef.current = null;
    setDrag(null);
  };

  const dragDenoms = drag?.denoms ?? [];

  const dragGhost = drag ? (
    <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 300, pointerEvents: "none" }}>
      {dragDenoms.map((denom, i) => {
        // Every chip chases the cursor on its own transition, each a little
        // slower than the one below it. Nothing here is scripted frame by
        // frame — the browser is always interpolating toward the latest
        // pointer position, so a fast flick stretches the stack out behind
        // the hand and a pause lets it gather back together. That lag is the
        // whole effect: it gives the chips weight, so they read as something
        // soft being carried rather than a cursor icon pinned to the mouse.
        const lag = DRAG_FOLLOW_MS + i * DRAG_FOLLOW_STAGGER_MS;
        const lift = drag.landing ? 0 : DRAG_LIFT + i * DRAG_CHIP_STAGGER;
        const scale = drag.landing ? 0.7 : drag.over ? 1.1 : 1;
        return (
          <img
            key={denom}
            src={`/mobile-assets/chip-${denom}.png`}
            alt=""
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: DRAG_CHIP_SIZE,
              height: DRAG_CHIP_SIZE,
              borderRadius: "50%",
              // translate3d keeps this on the compositor; animating left/top
              // would relayout the whole overlay on every pointer event.
              transform: `translate3d(${drag.x}px, ${drag.y}px, 0) translate(-50%, -50%) translateY(${-lift}px) scale(${scale})`,
              transition: drag.landing
                ? `transform ${DRAG_LAND_MS}ms cubic-bezier(0.2,0.75,0.3,1) ${i * 30}ms, opacity ${DRAG_LAND_MS}ms ease-in ${i * 30}ms`
                : `transform ${lag}ms cubic-bezier(0.22,1,0.36,1)`,
              // Fade out as they settle: the pad's own BetStackedChips are
              // already underneath (the move is optimistic), so this hands
              // the stack over rather than stacking two copies of it.
              opacity: drag.landing ? 0 : 1,
              zIndex: dragDenoms.length - i,
              filter: drag.over
                ? "drop-shadow(0 8px 16px rgba(0,0,0,0.65)) drop-shadow(0 0 7px rgba(255,255,255,0.6))"
                : "drop-shadow(0 8px 16px rgba(0,0,0,0.65))",
            }}
          />
        );
      })}
    </div>
  ) : null;

  // Only trust the live counts when they line up with the round currently
  // displayed. After RoundClosed we deliberately KEEP the last counts (so the
  // settlement screen still shows what people bet); a stale roundId during a
  // brief reconnect window also falls through to the local-bets fallback.
  const liveCounts =
    mainBetCounts && currentRound &&
    String(mainBetCounts.roundId) === String(currentRound.roundId)
      ? mainBetCounts
      : null;

  const totalPlayers = liveCounts
    ? liveCounts.Player.players + liveCounts.Tie.players + liveCounts.Banker.players
    : 0;

  const handleBet = useCallback(
    async (betCode: BetCode, targetEl: HTMLElement | null) => {
      // Swallow the click that trails a drag-move so it doesn't place a bet.
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        return;
      }
      if (!isBettingOpen) return;
      // Snapshot the chip denom we'll animate (selectedChip can change after placeBet)
      const flyDenom = selectedChip;
      // Pre-check: don't animate if the bet would be rejected
      if (selectedChip > balance || isOpposingBlocked(betCode)) {
        await placeBet(betCode);
        return;
      }
      // Fire the fly first so origin coords come from the still-active chip.
      dispatchChipFly({ betCode, denom: flyDenom, targetEl, addFlyingChip });
      await placeBet(betCode);
    },
    [isBettingOpen, placeBet, selectedChip, balance, isOpposingBlocked, addFlyingChip],
  );

  /* ── Mobile layout ── */
  if (isMobile) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {BETS.map((bet) => {
          const myBets = placedBets.filter((b) => b.betCode === bet.betCode);
          const myTotal = myBets.reduce((sum, b) => sum + b.amount, 0);
          const disabled = !isBettingOpen || isOpposingBlocked(bet.betCode);

          // Live aggregate across all players for this bucket. Falls back to
          // the local user's own bets when live counts aren't available
          // (demo mode or pre-WS).
          const key = COUNTS_KEY[bet.betCode];
          const liveBucket = liveCounts && key ? liveCounts[key] : null;
          const playerCount = liveBucket ? liveBucket.players : (myBets.length > 0 ? 1 : 0);
          const totalAmount = liveBucket ? liveBucket.amount : myTotal;
          const sharePct =
            liveCounts && totalPlayers > 0 && liveBucket
              ? Math.round((liveBucket.players / totalPlayers) * 100)
              : 0;

          return (
            <button
              key={bet.name}
              data-bet-code={bet.betCode}
              onClick={(e) => handleBet(bet.betCode, e.currentTarget)}
              onPointerDown={(e) => onPadPointerDown(bet.betCode, e)}
              onPointerMove={onPadPointerMove}
              onPointerUp={onPadPointerUp}
              onPointerCancel={onPadPointerCancel}
              disabled={disabled}
              style={{
                position: "relative",
                height: 96,
                borderRadius: 14,
                border: `1.6px solid ${drag?.over === bet.betCode ? "#ffffff" : bet.mobileBorder}`,
                boxShadow: drag?.over === bet.betCode ? "0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.45)" : undefined,
                touchAction: myTotal > 0 ? "none" : undefined,
                background: bet.mobileGradient,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled ? 0.5 : 1,
                padding: 0,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <BetStackedChips betCode={bet.betCode} />
              {/* Marble texture overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: "url(/mobile-assets/bet-card-texture.png)",
                  backgroundSize: "cover",
                  mixBlendMode: "color-burn",
                  opacity: 0.3,
                  borderRadius: 14,
                  pointerEvents: "none",
                }}
              />

              {/* Card content */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  height: "100%",
                  padding: "8px 6px",
                  boxSizing: "border-box",
                }}
              >
                {/* Bet name abbreviation — dominant element */}
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#fff",
                    lineHeight: 1,
                    letterSpacing: 0.4,
                    textShadow: "0 1px 3px rgba(0,0,0,0.35)",
                  }}
                >
                  {bet.abbrev}
                </span>

                {/* Total bet amount across all players — second most important */}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#fff",
                    lineHeight: 1,
                    letterSpacing: 0.2,
                  }}
                >
                  {totalAmount > 0 ? formatCompact(totalAmount, sym) : `${sym}0`}
                </span>

                {/* Stats row: people icon + count, then share % */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <img
                      src="/mobile-assets/people-icon.svg"
                      alt=""
                      style={{ width: 10, height: 10 }}
                    />
                    <span style={{ fontSize: 10, fontWeight: 600, color: "#fff" }}>
                      {playerCount}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                    }}
                  >
                    {sharePct}%
                  </span>
                </div>

                {/* Progress bar reflects share of total players */}
                <div
                  style={{
                    width: "100%",
                    height: 4,
                    borderRadius: 100,
                    backgroundColor: "rgba(255,255,255,0.22)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${sharePct}%`,
                      height: "100%",
                      borderRadius: 100,
                      backgroundColor: "#fff",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>
              </div>
            </button>
          );
        })}
        {dragGhost}
      </div>
    );
  }

  /* ── Desktop layout ── */
  return (
    <div className="grid grid-cols-3 h-full" style={{ gap: "0.4vw" }}>
      {BETS.map((bet) => {
        const myBets = placedBets.filter((b) => b.betCode === bet.betCode);
        const myTotal = myBets.reduce((sum, b) => sum + b.amount, 0);
        // Match mobile: disable opposing-side button (PLAYER vs BANKER are
        // mutually exclusive). Without this the click goes through, the
        // chip-fly animation fires, then the server rejects with
        // opposing_bet_exists — leaving a ghost chip on the button.
        const disabled = !isBettingOpen || isOpposingBlocked(bet.betCode);

        // Live aggregate across all players (falls back to local bets in demo).
        const key = COUNTS_KEY[bet.betCode];
        const liveBucket = liveCounts && key ? liveCounts[key] : null;
        const playerCount = liveBucket ? liveBucket.players : (myBets.length > 0 ? 1 : 0);
        const totalAmount = liveBucket ? liveBucket.amount : myTotal;
        const sharePct =
          liveCounts && totalPlayers > 0 && liveBucket
            ? Math.round((liveBucket.players / totalPlayers) * 100)
            : 0;

        return (
          <button
            key={bet.name}
            data-bet-code={bet.betCode}
            onClick={(e) => handleBet(bet.betCode, e.currentTarget)}
            onPointerDown={(e) => onPadPointerDown(bet.betCode, e)}
            onPointerMove={onPadPointerMove}
            onPointerUp={onPadPointerUp}
            onPointerCancel={onPadPointerCancel}
            disabled={disabled}
            className="relative transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer overflow-hidden h-full flex flex-col items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              border: `1.6px solid ${drag?.over === bet.betCode ? "#ffffff" : bet.border}`,
              borderRadius: "0.7vw",
              boxShadow: drag?.over === bet.betCode ? "0 0 0 2px rgba(255,255,255,0.9), 0 0 16px rgba(255,255,255,0.45)" : undefined,
              touchAction: myTotal > 0 ? "none" : undefined,
            }}
          >
            <BetStackedChips betCode={bet.betCode} size={22} />
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ borderRadius: "0.7vw" }}>
              <div className="absolute inset-0" style={{ backgroundImage: bet.gradient, borderRadius: "0.7vw" }} />
              <img alt="" className="absolute inset-0 w-full h-full object-cover" style={{ mixBlendMode: "color-burn", borderRadius: "0.7vw" }} src="/texture.png" />
            </div>

            <div className="relative z-10 w-full flex flex-col items-center justify-start h-full" style={{ padding: "0.6vh 0.8vw 3.2vh", gap: "0.3vh" }}>
              {/* Bet title */}
              <div className="font-bold text-white text-center leading-none" style={{ fontSize: "clamp(14px, 1.8vh, 24px)" }}>{t(bet.nameKey)}</div>

              {/* Player's own bet amount on this side -- the most important
                  number on the button. Falls back to a 1-em line when no bet
                  yet so the layout doesn't reflow when the first chip lands. */}
              <div
                className="font-extrabold text-white text-center leading-none"
                style={{
                  fontSize: "clamp(18px, 2.6vh, 32px)",
                  textShadow: "0 1px 4px rgba(0,0,0,0.45)",
                  letterSpacing: 0.3,
                  minHeight: "2.6vh",
                }}
              >
                {myTotal > 0 ? `${sym}${myTotal.toLocaleString()}` : isBettingOpen ? "—" : roundStatus === "waiting" ? "—" : t("bet.closed")}
              </div>

              {/* Share-of-players bar */}
              <div className="w-full bg-white/20 rounded-full overflow-hidden" style={{ height: "clamp(3px, 0.4vh, 8px)" }}>
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${sharePct}%` }}
                />
              </div>

              {/* Player count + total bet across all players + share */}
              <div className="flex items-center justify-between w-full text-white/70" style={{ fontSize: "clamp(7px, 0.85vh, 12px)" }}>
                <span>{t(playerCount === 1 ? "players.one" : "players.many", { count: playerCount })}</span>
                <span className="opacity-80">{totalAmount > 0 ? `${sym}${totalAmount.toLocaleString()}` : `${sym}0`}</span>
                <span>{sharePct}%</span>
              </div>
            </div>
          </button>
        );
      })}
      {dragGhost}
    </div>
  );
}
