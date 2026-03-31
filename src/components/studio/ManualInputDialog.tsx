"use client";

import { useState, useCallback, useReducer } from "react";
import { clientFetch } from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Baccarat card values & third-card rules                            */
/* ------------------------------------------------------------------ */

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"] as const;
const SUITS = [
  { code: "S", symbol: "\u2660", color: "#FFFFFF" },
  { code: "H", symbol: "\u2665", color: "#FF4444" },
  { code: "D", symbol: "\u2666", color: "#FF4444" },
  { code: "C", symbol: "\u2663", color: "#FFFFFF" },
] as const;

const CARD_VALUE: Record<string, number> = {
  A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, T: 0, J: 0, Q: 0, K: 0,
};

function cardPoint(card: string): number {
  if (!card || card.length < 2) return 0;
  return CARD_VALUE[card.slice(0, -1)] ?? 0;
}

function handScore(cards: string[]): number {
  return cards.reduce((sum, c) => sum + cardPoint(c), 0) % 10;
}

function bankerDrawsOn(bankerTotal: number, playerThirdValue: number): boolean {
  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return playerThirdValue !== 8;
  if (bankerTotal === 4) return [2, 3, 4, 5, 6, 7].includes(playerThirdValue);
  if (bankerTotal === 5) return [4, 5, 6, 7].includes(playerThirdValue);
  if (bankerTotal === 6) return [6, 7].includes(playerThirdValue);
  return false; // 7 = always stands
}

interface ThirdCardInfo {
  playerDraws: boolean;
  bankerDraws: boolean | "depends";
  isNatural: boolean;
  handComplete: boolean;
  status: string;
}

function baccaratNeedsThird(playerCards: string[], bankerCards: string[]): ThirdCardInfo {
  if (playerCards.length < 2 || bankerCards.length < 2) {
    return {
      playerDraws: false, bankerDraws: false,
      isNatural: false, handComplete: false,
      status: "Deal 2 cards to each side first",
    };
  }

  const ps = handScore(playerCards.slice(0, 2));
  const bs = handScore(bankerCards.slice(0, 2));

  // Natural
  if (ps >= 8 || bs >= 8) {
    return {
      playerDraws: false, bankerDraws: false,
      isNatural: true, handComplete: true,
      status: `Natural ${ps >= 8 ? "Player" : "Banker"} ${Math.max(ps, bs)}`,
    };
  }

  const playerDraws = ps <= 5;

  if (!playerDraws) {
    // Player stands (6 or 7)
    const bDraws = bs <= 5;
    return {
      playerDraws: false, bankerDraws: bDraws,
      isNatural: false,
      handComplete: !bDraws,
      status: "Player stands" + (bDraws ? "; Banker must draw" : ""),
    };
  }

  // Player draws -- need 3rd card to decide banker
  if (playerCards.length < 3) {
    return {
      playerDraws: true, bankerDraws: "depends",
      isNatural: false, handComplete: false,
      status: "Player must draw a 3rd card",
    };
  }

  // Player has drawn -- evaluate banker
  const p3Val = cardPoint(playerCards[2]);
  const bDraws = bankerDrawsOn(bs, p3Val);
  return {
    playerDraws: true, bankerDraws: bDraws,
    isNatural: false,
    handComplete: !bDraws || bankerCards.length >= 3,
    status: bDraws && bankerCards.length < 3 ? "Banker must draw" : "Hand complete",
  };
}

/* ------------------------------------------------------------------ */
/*  State management via useReducer                                    */
/* ------------------------------------------------------------------ */

type DealingSide = "player" | "banker";

interface DealState {
  playerCards: string[];
  bankerCards: string[];
  currentSide: DealingSide;
}

type DealAction =
  | { type: "ADD_CARD"; card: string }
  | { type: "UNDO" }
  | { type: "CLEAR" }
  | { type: "SET_SIDE"; side: DealingSide };

function dealReducer(state: DealState, action: DealAction): DealState {
  switch (action.type) {
    case "SET_SIDE":
      return { ...state, currentSide: action.side };

    case "CLEAR":
      return { playerCards: [], bankerCards: [], currentSide: "player" };

    case "UNDO": {
      const pc = [...state.playerCards];
      const bc = [...state.bankerCards];

      if (pc.length === 0 && bc.length === 0) return state;

      // Third cards: remove banker 3rd first, then player 3rd
      if (bc.length === 3) {
        bc.pop();
      } else if (pc.length === 3) {
        pc.pop();
      }
      // Initial deal reverse: B2, P2, B1, P1
      else if (bc.length === 2 && pc.length === 2) {
        bc.pop();
      } else if (pc.length === 2 && bc.length === 1) {
        pc.pop();
      } else if (bc.length === 1 && pc.length === 1) {
        bc.pop();
      } else if (pc.length === 1 && bc.length === 0) {
        pc.pop();
      }

      // Determine what side should be active after undo
      let side: DealingSide = "player";
      if (pc.length === 0 && bc.length === 0) side = "player";
      else if (pc.length === 1 && bc.length === 0) side = "banker";
      else if (pc.length === 1 && bc.length === 1) side = "player";
      else if (pc.length === 2 && bc.length === 1) side = "banker";
      else if (pc.length >= 2 && bc.length >= 2) {
        const info = baccaratNeedsThird(pc, bc);
        if (info.playerDraws && pc.length < 3) side = "player";
        else if (info.bankerDraws === true && bc.length < 3) side = "banker";
      }

      return { playerCards: pc, bankerCards: bc, currentSide: side };
    }

    case "ADD_CARD": {
      const { card } = action;
      const pc = [...state.playerCards];
      const bc = [...state.bankerCards];
      let side = state.currentSide;

      // Phase 1: initial deal (P1, B1, P2, B2)
      if (pc.length < 2 || bc.length < 2) {
        if (side === "player") {
          if (pc.length >= 2) return state; // already have 2
          pc.push(card);
          if (pc.length === 1 && bc.length === 0) side = "banker";
          else if (pc.length === 2 && bc.length === 1) side = "banker";
        } else {
          if (bc.length >= 2) return state;
          bc.push(card);
          if (bc.length === 1 && pc.length === 1) side = "player";
          // bc === 2 && pc === 2: stay, update_display will guide
        }
        return { playerCards: pc, bankerCards: bc, currentSide: side };
      }

      // Phase 2: third-card rules
      const info = baccaratNeedsThird(pc, bc);

      if (info.isNatural || info.handComplete) return state;

      // Player's third card
      if (info.playerDraws && pc.length < 3) {
        pc.push(card);
        const info2 = baccaratNeedsThird(pc, bc);
        if (info2.bankerDraws === true && bc.length < 3) {
          side = "banker";
        }
        return { playerCards: pc, bankerCards: bc, currentSide: side };
      }

      // Banker's third card
      if (info.bankerDraws === true && bc.length < 3) {
        bc.push(card);
        return { playerCards: pc, bankerCards: bc, currentSide: side };
      }

      return state;
    }

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

interface ManualInputDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

export default function ManualInputDialog({ open, onClose, onSubmitted }: ManualInputDialogProps) {
  const [state, dispatch] = useReducer(dealReducer, {
    playerCards: [],
    bankerCards: [],
    currentSide: "player" as DealingSide,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { playerCards, bankerCards, currentSide } = state;

  /* ---- Computed state ---- */
  const totalDealt = playerCards.length + bankerCards.length;
  const initialPhase = playerCards.length < 2 || bankerCards.length < 2;

  let thirdCardInfo: ThirdCardInfo = {
    playerDraws: false, bankerDraws: false,
    isNatural: false, handComplete: false,
    status: "Deal: P1 \u2192 B1 \u2192 P2 \u2192 B2",
  };
  if (!initialPhase) {
    thirdCardInfo = baccaratNeedsThird(playerCards, bankerCards);
  } else if (totalDealt > 0) {
    thirdCardInfo = {
      ...thirdCardInfo,
      status: `Dealing initial cards... (${totalDealt}/4)`,
    };
  }

  const pScore = playerCards.length > 0 ? handScore(playerCards) : null;
  const bScore = bankerCards.length > 0 ? handScore(bankerCards) : null;

  /* ---- Handlers ---- */
  const addCard = useCallback((card: string) => {
    setError("");
    dispatch({ type: "ADD_CARD", card });
  }, []);

  const undoLast = useCallback(() => {
    setError("");
    dispatch({ type: "UNDO" });
  }, []);

  const clearAll = useCallback(() => {
    setError("");
    dispatch({ type: "CLEAR" });
  }, []);

  /* ---- Submit ---- */
  const handleSubmit = async () => {
    if (!thirdCardInfo.handComplete) return;

    setSubmitting(true);
    setError("");
    try {
      const ps = handScore(playerCards);
      const bs = handScore(bankerCards);
      let outcome: string;
      if (ps > bs) outcome = "Player";
      else if (bs > ps) outcome = "Banker";
      else outcome = "Tie";

      const playerPair = playerCards.length >= 2 && playerCards[0].slice(0, -1) === playerCards[1].slice(0, -1);
      const bankerPair = bankerCards.length >= 2 && bankerCards[0].slice(0, -1) === bankerCards[1].slice(0, -1);

      await clientFetch("/api/emulator/deal", {
        method: "POST",
        body: JSON.stringify({
          player_cards: playerCards,
          banker_cards: bankerCards,
          player_score: ps,
          banker_score: bs,
          outcome,
          player_pair: playerPair,
          banker_pair: bankerPair,
        }),
      });

      onSubmitted?.();
      dispatch({ type: "CLEAR" });
      onClose();
    } catch {
      setError("Failed to submit round. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const usedCards = new Set([...playerCards, ...bankerCards]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-2xl rounded-xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #171717 0%, #000000 100%)",
          border: "1px solid rgba(208,135,0,0.3)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(208,135,0,0.15)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{ borderBottom: "1px solid rgba(208,135,0,0.2)" }}
        >
          <h2 className="font-bold text-lg" style={{ color: "#f0b100" }}>
            Manual Card Input
          </h2>
          <button
            onClick={onClose}
            className="text-[#6a7282] hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Card display */}
        <div className="px-6 py-3">
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(208,135,0,0.15)",
            }}
          >
            {/* Player hand */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm" style={{ color: "#2b7fff" }}>PLAYER</span>
                <div className="flex gap-1">
                  {playerCards.length === 0 ? (
                    <span className="text-xs text-[#4a5565]">(no cards)</span>
                  ) : (
                    playerCards.map((c, i) => <CardChip key={i} card={c} accent="#2b7fff" />)
                  )}
                </div>
              </div>
              <span className="font-bold text-sm" style={{ color: "#2b7fff" }}>
                {pScore !== null ? `Score: ${pScore}` : "Score: -"}
              </span>
            </div>

            {/* Banker hand */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm" style={{ color: "#fb2c36" }}>BANKER</span>
                <div className="flex gap-1">
                  {bankerCards.length === 0 ? (
                    <span className="text-xs text-[#4a5565]">(no cards)</span>
                  ) : (
                    bankerCards.map((c, i) => <CardChip key={i} card={c} accent="#fb2c36" />)
                  )}
                </div>
              </div>
              <span className="font-bold text-sm" style={{ color: "#fb2c36" }}>
                {bScore !== null ? `Score: ${bScore}` : "Score: -"}
              </span>
            </div>
          </div>
        </div>

        {/* Status label */}
        <div className="px-6 py-1 text-center">
          <span
            className="text-sm font-semibold"
            style={{ color: thirdCardInfo.handComplete ? "#44BB44" : "#f0b100" }}
          >
            {thirdCardInfo.status}
          </span>
        </div>

        {/* Side selector + undo */}
        <div className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6a7282]">Dealing to:</span>
            <button
              onClick={() => dispatch({ type: "SET_SIDE", side: "player" })}
              className="rounded px-3 py-1 text-xs font-bold transition-colors"
              style={{
                backgroundColor: currentSide === "player" ? "#2b7fff" : "#333333",
                color: "white",
              }}
            >
              PLAYER
            </button>
            <button
              onClick={() => dispatch({ type: "SET_SIDE", side: "banker" })}
              className="rounded px-3 py-1 text-xs font-bold transition-colors"
              style={{
                backgroundColor: currentSide === "banker" ? "#fb2c36" : "#333333",
                color: "white",
              }}
            >
              BANKER
            </button>
          </div>
          <button
            onClick={undoLast}
            className="rounded px-3 py-1 text-xs font-medium hover:opacity-80"
            style={{ backgroundColor: "#663333", color: "white" }}
          >
            Undo Last
          </button>
        </div>

        {/* Card picker grid */}
        <div className="px-6 py-2">
          <div
            className="rounded-lg p-3"
            style={{
              backgroundColor: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(208,135,0,0.15)",
            }}
          >
            <p className="text-xs text-[#4a5565] mb-2">Select a card:</p>
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(13, 1fr)" }}>
              {SUITS.map((suit) =>
                RANKS.map((rank) => {
                  const cardCode = `${rank}${suit.code}`;
                  const isUsed = usedCards.has(cardCode);
                  return (
                    <button
                      key={cardCode}
                      onClick={() => addCard(cardCode)}
                      disabled={isUsed}
                      className="rounded text-center font-bold transition-colors disabled:opacity-20 hover:opacity-80"
                      style={{
                        fontSize: "clamp(9px, 1vw, 12px)",
                        padding: "4px 2px",
                        backgroundColor: isUsed ? "#111" : "#1a1a1a",
                        border: `1px solid ${isUsed ? "#222" : "#333"}`,
                        color: suit.color,
                      }}
                    >
                      {rank}{suit.symbol}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-6 py-1">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Footer buttons */}
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{ borderTop: "1px solid rgba(208,135,0,0.2)" }}
        >
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-[#99a1af] hover:text-white"
              style={{ backgroundColor: "rgba(255,255,255,0.08)" }}
            >
              Cancel
            </button>
            <button
              onClick={clearAll}
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ backgroundColor: "#663333", color: "white" }}
            >
              Clear All
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!thirdCardInfo.handComplete || submitting}
            className="rounded-lg px-6 py-2 text-sm font-bold text-white disabled:opacity-30 transition-colors"
            style={{
              backgroundColor: thirdCardInfo.handComplete ? "#226622" : "#333333",
            }}
          >
            {submitting ? "Submitting..." : "Submit Round"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card chip                                                          */
/* ------------------------------------------------------------------ */

function CardChip({ card, accent }: { card: string; accent: string }) {
  const rank = card.slice(0, -1);
  const suitCode = card.slice(-1);
  const suitMap: Record<string, string> = { S: "\u2660", H: "\u2665", D: "\u2666", C: "\u2663" };
  const colorMap: Record<string, string> = { S: "#FFFFFF", H: "#FF4444", D: "#FF4444", C: "#FFFFFF" };

  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold"
      style={{
        backgroundColor: "#1a1a1a",
        border: `1px solid ${accent}`,
        color: colorMap[suitCode] ?? "#FFFFFF",
      }}
    >
      {rank}{suitMap[suitCode] ?? "?"}
    </span>
  );
}
