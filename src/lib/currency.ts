/**
 * Currency symbol map — code-driven so the UI renders the correct symbol
 * for whatever currency the operator's wallet reports on the balance WS
 * "connected" frame. Demo mode never gets a currency frame, so the
 * GameContext default of "PHP" covers it.
 *
 * NEVER use Intl `style: "currency"` without `currencyDisplay: "narrowSymbol"`
 * — it renders "PHP 1,000" / "US$1,000" instead of the bare "₱"/"$" symbol
 * the design calls for. This map + a plain number format is the locked
 * approach.
 */
const SYMBOLS: Record<string, string> = {
  PHP: "₱",
  USD: "$",
  THB: "฿",
  VND: "₫",
};

/**
 * Returns the display symbol for a currency code. Unknown codes fall back to
 * the uppercased code followed by a single space (e.g. "AUD 1,000").
 */
export function symbolFor(code: string | null | undefined): string {
  if (!code) return SYMBOLS.PHP;
  const upper = code.toUpperCase();
  return SYMBOLS[upper] ?? `${upper} `;
}

/**
 * Formats an amount as `<symbol><rounded, grouped number>` — the standard
 * money render used across the player UI. Whole numbers only (no decimals),
 * matching the chip-denominated betting model.
 */
export function formatMoney(amount: number, code: string | null | undefined): string {
  return `${symbolFor(code)}${Math.round(amount).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

/**
 * Formats a wallet balance with exact minor units (2 decimals) — the real
 * operator balance can carry cents (e.g. ₱10.61 from a 0.95x banker payoff),
 * and rounding it misrepresents the player's money. Use this for the balance
 * readout and any "you have X" copy; keep `formatMoney` for chip-denominated
 * bet/stake amounts that are always whole.
 */
export function formatBalance(amount: number, code: string | null | undefined): string {
  return `${symbolFor(code)}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
