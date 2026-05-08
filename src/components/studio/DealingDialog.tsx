"use client";

/**
 * DealingDialog — live shoe verification modal.
 *
 * Subscribes to Angel Eye `card_dealt` events directly (no API round-trip)
 * and renders a 6-slot grid (P1, B1, P2, B2, P3, B3) so the dealer can
 * verify each card on screen as the shoe reads it. Tap any slot to
 * override a misread locally. Confirm & Settle submits the full hand
 * once via the existing /api/studio/manual-deal endpoint, which deals,
 * sets the result, and triggers settlement in one POST.
 *
 * Player UI does NOT see cards before settlement — they have the live
 * video feed of the physical deal. They only need the result.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useStudio } from "@/lib/studio-context";
import { clientFetch } from "@/lib/api";
import {
  RANKS,
  SUITS,
  handScore,
  baccaratNeedsThird,
  determineOutcome,
  isPair,
} from "@/lib/baccarat-rules";

interface DealingDialogProps {
  open: boolean;
  onClose: () => void;
  onSwitchToManual: () => void;
}

type Side = "player" | "banker";

interface SlotKey {
  side: Side;
  index: 0 | 1 | 2;
}

const SLOTS: SlotKey[] = [
  { side: "player", index: 0 },
  { side: "banker", index: 0 },
  { side: "player", index: 1 },
  { side: "banker", index: 1 },
  { side: "player", index: 2 },
  { side: "banker", index: 2 },
];

const SUIT_COLOR: Record<string, string> = {
  S: "#ffffff", C: "#ffffff",
  H: "#fb2c36", D: "#fb2c36",
};

const SUIT_SYMBOL: Record<string, string> = {
  S: "\u2660", C: "\u2663", H: "\u2665", D: "\u2666",
};

export default function DealingDialog({ open, onClose, onSwitchToManual }: DealingDialogProps) {
  const studio = useStudio();
  const angelEye = studio.angelEye;

  const [playerCards, setPlayerCards] = useState<string[]>([]);
  const [bankerCards, setBankerCards] = useState<string[]>([]);
  const [editing, setEditing] = useState<SlotKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset local state every time the modal opens for a new round.
  useEffect(() => {
    if (open) {
      setPlayerCards([]);
      setBankerCards([]);
      setEditing(null);
      setError(null);
    }
  }, [open]);

  // Subscribe to Angel Eye card_dealt events while the modal is open.
  // Cards fill in the next free slot for the side the shoe reports.
  useEffect(() => {
    if (!open) return;
    const unsubscribe = angelEye.onEvent((event) => {
      if (event.type !== "card_dealt") return;
      if (event.side === "player") {
        setPlayerCards((prev) => (prev.length >= 3 ? prev : [...prev, event.card]));
      } else if (event.side === "banker") {
        setBankerCards((prev) => (prev.length >= 3 ? prev : [...prev, event.card]));
      }
    });
    return unsubscribe;
  }, [open, angelEye]);

  // Auto-close once the round is no longer in dealing phase (settled / waiting).
  useEffect(() => {
    if (!open) return;
    if (studio.roundStatus === "waiting" || studio.roundStatus === "betting_open") {
      onClose();
    }
  }, [open, studio.roundStatus, onClose]);

  const cardsForSide = useCallback(
    (side: Side) => (side === "player" ? playerCards : bankerCards),
    [playerCards, bankerCards],
  );

  const setCardAt = useCallback((slot: SlotKey, card: string) => {
    const setter = slot.side === "player" ? setPlayerCards : setBankerCards;
    setter((prev) => {
      const copy = [...prev];
      while (copy.length < slot.index) copy.push("");
      copy[slot.index] = card;
      return copy.filter((c, i) => c || i < slot.index);
    });
    setEditing(null);
  }, []);

  const clearSlot = useCallback((slot: SlotKey) => {
    const setter = slot.side === "player" ? setPlayerCards : setBankerCards;
    setter((prev) => prev.slice(0, slot.index));
    setEditing(null);
  }, []);

  const info = useMemo(
    () => baccaratNeedsThird(playerCards, bankerCards),
    [playerCards, bankerCards],
  );

  const pScore = handScore(playerCards);
  const bScore = handScore(bankerCards);

  // A slot is "shown" if its index < cards-needed-for-that-side.
  // P1/B1/P2/B2 always shown. P3/B3 only when third-card rule says so or
  // when the dealer has already placed a card there (manual override case).
  const slotVisible = useCallback(
    (slot: SlotKey): boolean => {
      if (slot.index < 2) return true;
      const cards = cardsForSide(slot.side);
      if (cards.length > slot.index) return true;
      if (slot.side === "player") return info.playerDraws;
      return info.bankerDraws === true;
    },
    [info, cardsForSide],
  );

  const submit = useCallback(async () => {
    if (!info.handComplete) return;
    setSubmitting(true);
    setError(null);

    const outcome = determineOutcome(playerCards, bankerCards);
    const player_pair = isPair(playerCards);
    const banker_pair = isPair(bankerCards);

    try {
      const res = await clientFetch("/api/studio/manual-deal", {
        method: "POST",
        body: JSON.stringify({
          game_id: studio.tableId,
          player_cards: playerCards,
          banker_cards: bankerCards,
          player_score: pScore,
          banker_score: bScore,
          outcome,
          player_pair,
          banker_pair,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setError(data.error || `HTTP ${res.status}`);
        setSubmitting(false);
        return;
      }
      // Success — wait for RoundResult/RoundSettled WS to flip status,
      // useEffect above will close the modal.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
      setSubmitting(false);
    }
  }, [info.handComplete, playerCards, bankerCards, pScore, bScore, studio.tableId]);

  if (!open) return null;

  const shoeConnected = angelEye.status === "connected";

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.85)" }}
    >
      <div
        className="rounded-xl p-6 flex flex-col gap-4"
        style={{
          width: "min(900px, 92vw)",
          maxHeight: "90vh",
          background: "linear-gradient(135deg, #171717 0%, #000 100%)",
          border: "1px solid rgba(208,135,0,0.4)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor: shoeConnected ? "#05df72" : "#fb2c36",
                animation: shoeConnected ? "pulse 1.2s infinite" : undefined,
              }}
            />
            <h2 className="text-xl font-bold" style={{ color: "#d08700" }}>
              DEALING — verify each card
            </h2>
          </div>
          <span className="text-xs" style={{ color: "#6a7282" }}>
            {shoeConnected ? "Shoe connected" : "Shoe disconnected — manual entry only"}
          </span>
        </div>

        {/* Status banner */}
        <div
          className="rounded-lg px-4 py-2 text-sm"
          style={{
            backgroundColor: info.handComplete
              ? "rgba(5,223,114,0.12)"
              : "rgba(208,135,0,0.10)",
            color: info.handComplete ? "#05df72" : "#d08700",
            border: `1px solid ${info.handComplete ? "rgba(5,223,114,0.3)" : "rgba(208,135,0,0.3)"}`,
          }}
        >
          {info.status}
        </div>

        {/* Card grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <SideColumn
            label="PLAYER"
            color="#2b7fff"
            cards={playerCards}
            score={pScore}
            slots={SLOTS.filter((s) => s.side === "player").filter(slotVisible)}
            onEdit={(slot) => setEditing(slot)}
            onClear={clearSlot}
          />
          <SideColumn
            label="BANKER"
            color="#fb2c36"
            cards={bankerCards}
            score={bScore}
            slots={SLOTS.filter((s) => s.side === "banker").filter(slotVisible)}
            onEdit={(slot) => setEditing(slot)}
            onClear={clearSlot}
          />
        </div>

        {error && (
          <div
            className="rounded-md px-3 py-2 text-sm"
            style={{ backgroundColor: "rgba(251,44,54,0.12)", color: "#fb2c36" }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onSwitchToManual}
            className="text-sm underline"
            style={{ color: "#99a1af" }}
            disabled={submitting}
          >
            Switch to full Manual Input
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg px-4 py-2 text-sm font-semibold"
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                color: "#99a1af",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              Hide
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!info.handComplete || submitting}
              className="rounded-lg px-6 py-2 text-sm font-bold tracking-wider"
              style={{
                backgroundColor: info.handComplete && !submitting ? "#05df72" : "rgba(255,255,255,0.05)",
                color: info.handComplete && !submitting ? "#000" : "#6a7282",
                cursor: info.handComplete && !submitting ? "pointer" : "not-allowed",
                boxShadow: info.handComplete && !submitting ? "0 4px 15px rgba(5,223,114,0.3)" : "none",
              }}
            >
              {submitting ? "SETTLING..." : "CONFIRM & SETTLE"}
            </button>
          </div>
        </div>
      </div>

      {/* Card picker overlay */}
      {editing && (
        <CardPicker
          slot={editing}
          onPick={(card) => setCardAt(editing, card)}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Side column (player or banker)                                     */
/* ------------------------------------------------------------------ */

interface SideColumnProps {
  label: string;
  color: string;
  cards: string[];
  score: number;
  slots: SlotKey[];
  onEdit: (slot: SlotKey) => void;
  onClear: (slot: SlotKey) => void;
}

function SideColumn({ label, color, cards, score, slots, onEdit, onClear }: SideColumnProps) {
  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-3"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: `1px solid ${color}33`,
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold tracking-wider" style={{ color }}>
          {label}
        </span>
        <span className="text-2xl font-bold" style={{ color }}>
          {cards.length > 0 ? score : "—"}
        </span>
      </div>
      <div className="flex gap-2">
        {slots.map((slot) => {
          const card = cards[slot.index];
          return (
            <CardSlot
              key={`${slot.side}-${slot.index}`}
              card={card}
              onClick={() => onEdit(slot)}
              onClear={card ? () => onClear(slot) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single card slot                                                   */
/* ------------------------------------------------------------------ */

interface CardSlotProps {
  card: string | undefined;
  onClick: () => void;
  onClear?: () => void;
}

function CardSlot({ card, onClick, onClear }: CardSlotProps) {
  const filled = !!card;
  const rank = filled ? (card![0] === "T" ? "10" : card![0]) : "";
  const suit = filled ? card!.slice(-1) : "";

  return (
    <div
      className="relative rounded-md cursor-pointer transition-transform hover:scale-105"
      onClick={onClick}
      style={{
        width: 64,
        height: 88,
        backgroundColor: filled ? "#1a1a2e" : "rgba(255,255,255,0.04)",
        border: filled
          ? "1px solid rgba(255,255,255,0.18)"
          : "1px dashed rgba(255,255,255,0.15)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {filled ? (
        <>
          <span style={{ color: "#fff", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
            {rank}
          </span>
          <span
            style={{
              color: SUIT_COLOR[suit] || "#fff",
              fontSize: 24,
              lineHeight: 1,
              marginTop: 4,
            }}
          >
            {SUIT_SYMBOL[suit] || suit}
          </span>
          {onClear && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              style={{
                position: "absolute",
                top: -8,
                right: -8,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "#fb2c36",
                color: "#fff",
                fontSize: 12,
                lineHeight: "18px",
                textAlign: "center",
                border: "none",
                cursor: "pointer",
              }}
              title="Clear this card"
            >
              ×
            </button>
          )}
        </>
      ) : (
        <span style={{ color: "#6a7282", fontSize: 22 }}>+</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single-card picker overlay                                         */
/* ------------------------------------------------------------------ */

interface CardPickerProps {
  slot: SlotKey;
  onPick: (card: string) => void;
  onCancel: () => void;
}

function CardPicker({ slot, onPick, onCancel }: CardPickerProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={onCancel}
    >
      <div
        className="rounded-xl p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)",
          background: "#171717",
          border: "1px solid rgba(208,135,0,0.4)",
        }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wider" style={{ color: "#d08700" }}>
            Pick card for {slot.side.toUpperCase()} #{slot.index + 1}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-xs"
            style={{ color: "#99a1af" }}
          >
            Cancel
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {SUITS.map((suit) => (
            <div key={suit.code} className="flex gap-1">
              {RANKS.map((rank) => {
                const card = `${rank}${suit.code}`;
                const display = rank === "T" ? "10" : rank;
                return (
                  <button
                    key={card}
                    type="button"
                    onClick={() => onPick(card)}
                    className="rounded font-bold transition-transform hover:scale-110"
                    style={{
                      width: 36,
                      height: 48,
                      backgroundColor: "#1a1a2e",
                      color: suit.color,
                      border: "1px solid rgba(255,255,255,0.1)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                    }}
                    title={`${display}${suit.symbol}`}
                  >
                    <span style={{ color: "#fff" }}>{display}</span>
                    <span>{suit.symbol}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
