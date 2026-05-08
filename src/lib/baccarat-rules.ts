/**
 * Shared baccarat helpers: card values, score, third-card rules.
 * Used by ManualInputDialog (full-hand entry) and DealingDialog
 * (live verification while Angel Eye reads).
 */

export const RANKS = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K",
] as const;

export const SUITS = [
  { code: "S", symbol: "\u2660", color: "#FFFFFF" },
  { code: "H", symbol: "\u2665", color: "#FF4444" },
  { code: "D", symbol: "\u2666", color: "#FF4444" },
  { code: "C", symbol: "\u2663", color: "#FFFFFF" },
] as const;

export const CARD_VALUE: Record<string, number> = {
  A: 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  "8": 8, "9": 9, T: 0, J: 0, Q: 0, K: 0,
};

export function cardPoint(card: string): number {
  if (!card || card.length < 2) return 0;
  return CARD_VALUE[card.slice(0, -1)] ?? 0;
}

export function handScore(cards: string[]): number {
  return cards.reduce((sum, c) => sum + cardPoint(c), 0) % 10;
}

export function bankerDrawsOn(bankerTotal: number, playerThirdValue: number): boolean {
  if (bankerTotal <= 2) return true;
  if (bankerTotal === 3) return playerThirdValue !== 8;
  if (bankerTotal === 4) return [2, 3, 4, 5, 6, 7].includes(playerThirdValue);
  if (bankerTotal === 5) return [4, 5, 6, 7].includes(playerThirdValue);
  if (bankerTotal === 6) return [6, 7].includes(playerThirdValue);
  return false; // 7 = always stands
}

export interface ThirdCardInfo {
  playerDraws: boolean;
  bankerDraws: boolean | "depends";
  isNatural: boolean;
  handComplete: boolean;
  status: string;
}

export function baccaratNeedsThird(
  playerCards: string[],
  bankerCards: string[],
): ThirdCardInfo {
  if (playerCards.length < 2 || bankerCards.length < 2) {
    return {
      playerDraws: false, bankerDraws: false,
      isNatural: false, handComplete: false,
      status: "Deal 2 cards to each side first",
    };
  }

  const ps = handScore(playerCards.slice(0, 2));
  const bs = handScore(bankerCards.slice(0, 2));

  if (ps >= 8 || bs >= 8) {
    return {
      playerDraws: false, bankerDraws: false,
      isNatural: true, handComplete: true,
      status: `Natural ${ps >= 8 ? "Player" : "Banker"} ${Math.max(ps, bs)}`,
    };
  }

  const playerDraws = ps <= 5;

  if (!playerDraws) {
    const bDraws = bs <= 5;
    return {
      playerDraws: false, bankerDraws: bDraws,
      isNatural: false,
      handComplete: !bDraws,
      status: "Player stands" + (bDraws ? "; Banker must draw" : ""),
    };
  }

  if (playerCards.length < 3) {
    return {
      playerDraws: true, bankerDraws: "depends",
      isNatural: false, handComplete: false,
      status: "Player must draw a 3rd card",
    };
  }

  const p3Val = cardPoint(playerCards[2]);
  const bDraws = bankerDrawsOn(bs, p3Val);
  return {
    playerDraws: true, bankerDraws: bDraws,
    isNatural: false,
    handComplete: !bDraws || bankerCards.length >= 3,
    status: bDraws && bankerCards.length < 3 ? "Banker must draw" : "Hand complete",
  };
}

export function determineOutcome(playerCards: string[], bankerCards: string[]): "Player" | "Banker" | "Tie" {
  const ps = handScore(playerCards);
  const bs = handScore(bankerCards);
  if (ps > bs) return "Player";
  if (bs > ps) return "Banker";
  return "Tie";
}

export function isPair(cards: string[]): boolean {
  if (cards.length < 2) return false;
  return cards[0].slice(0, -1) === cards[1].slice(0, -1);
}
