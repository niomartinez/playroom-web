/**
 * Bet code → human-readable label.
 *
 * Backend bet codes follow the EvoLive convention "BAC_<Type>". The player UI
 * displays them in uppercase words (matching the labels rendered in
 * MainBets/SideBets), so the WinFlash overlay reuses the same vocabulary.
 *
 * `betCodeLabel` is forgiving — unknown codes fall back to a tidied version of
 * the suffix so we never render a raw "BAC_*" identifier to a player.
 */
const LABELS: Record<string, string> = {
  BAC_Player: "PLAYER",
  BAC_Banker: "BANKER",
  BAC_Tie: "TIE",
  BAC_PlayerPair: "PLAYER PAIR",
  BAC_BankerPair: "BANKER PAIR",
  BAC_EitherPair: "EITHER PAIR",
  BAC_PerfectPair: "PERFECT PAIR",
  BAC_SuperSix: "SUPER SIX",
  BAC_PlayerBonus: "PLAYER BONUS",
  BAC_BankerBonus: "BANKER BONUS",
  BAC_Dragon7: "DRAGON 7",
  BAC_Panda8: "PANDA 8",
  BAC_Lucky6: "LUCKY 6",
  BAC_Lucky7: "LUCKY 7",
  BAC_BigTiger: "BIG TIGER",
  BAC_SmallTiger: "SMALL TIGER",
};

/**
 * Returns the display label for a backend bet code. Falls back to the
 * de-camelCased suffix when the code isn't in the lookup so new bet codes
 * still render legibly without a frontend deploy.
 */
export function betCodeLabel(code: string): string {
  if (LABELS[code]) return LABELS[code];

  // Tolerate variant casings (e.g. "BAC_BANKER")
  const norm = Object.keys(LABELS).find(
    (k) => k.toLowerCase() === code.toLowerCase(),
  );
  if (norm) return LABELS[norm];

  // Strip the BAC_ prefix and split camelCase ("PerfectPair" -> "PERFECT PAIR")
  const suffix = code.replace(/^BAC_?/i, "");
  const spaced = suffix.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ");
  return spaced.toUpperCase().trim() || code;
}
