"use client";

import { useGame } from "./game-context";
import { useSeatGate } from "./use-seat-gate";
import { useT } from "./i18n";
import { formatMoney } from "./currency";
import { resolveMinSeatBalance } from "./min-seat-balance";

/**
 * Seat-balance warning zone: `floor <= balance < warn`, where `floor` is the
 * rule that actually applies to THIS player right now — the keep-your-seat
 * `block` once they have played here, the buy-in `enter` before that. Below the
 * floor the gate takes over and covers the screen; this band is the strip just
 * above it, where we nudge before the balance drops through.
 *
 * It lives here rather than inside BalanceBar because the band is a money rule
 * and it is now read by two components on two breakpoints — BalanceBar on
 * desktop, SeatWarnBubble on mobile. Two copies would drift the day `warn`
 * changes meaning, and the two would then disagree about whether a player is
 * in trouble depending on the width of their screen.
 *
 * IT ASKS THE SERVER, NOT THE BALANCE. This used to read balance + thresholds
 * alone and warn whenever the arithmetic said so, which got it wrong twice:
 *   - a seamless-wallet player, whom `evaluate_seat` gates with NO rule at all
 *     (`enforced: false`), was told to keep a floor that does not exist for
 *     them;
 *   - the copy always interpolated `block`, so a player who had not yet played
 *     here — held to `enter`, a different and usually higher bar — was quoted a
 *     figure that was not the one they had to clear.
 * Both are the same mistake the gate itself was just fixed for, so the warning
 * now derives from the same authoritative decision the gate does.
 *
 * This is a nudge, never an enforcement point: the server independently refuses
 * bets and cuts the video feed at its own floors. So when we do not KNOW, we
 * stay quiet rather than guess — an unwarranted warning is a real cost and a
 * missing one is not, because nothing about the money depends on this text.
 */
export interface SeatWarn {
  /** True while the wallet sits in the warning band. */
  warnLow: boolean;
  /** The floor that applies to this player right now — `enter` or `block`. */
  floor: number;
  /** The localized warning line, with that floor interpolated. */
  text: string;
}

export function useSeatWarn(): SeatWarn {
  const { balance, balanceLoaded, currency, token, minSeatBalance, seat, placedBets } =
    useGame();
  const gate = useSeatGate();
  const t = useT();

  // The server's own decision. Only `SeatBootstrap` variants that carry one are
  // authoritative; "unknown" and "skipped" mean we were never told.
  const decision = "seat" in seat ? seat.seat : null;

  // Same threshold source and precedence as resolveSeatGate. If the two read
  // different numbers they can contradict each other — warn while the gate
  // blocks, or leave a silent gap between the band and the block.
  const thresholds = minSeatBalance ?? decision?.thresholds ?? null;
  const { enter, block, warn } = resolveMinSeatBalance(thresholds);

  // Which bar is this player actually held to?
  //
  // `gate.seated` is the latched answer the gate itself uses — the server's
  // durable "has played at this table" OR the client's "has bet here this page
  // lifetime" — so quoting off it keeps the two consistent. But the gate
  // SHORT-CIRCUITS to a bare OPEN on the all-in exemption, before it ever
  // computes `seated`, so it reports false for the whole stretch a player has
  // chips down. Reading it alone made the warning blink out at betting_open and
  // back in at settlement, once per hand, for exactly the low-balance players it
  // exists for. Chips on the table IS having played here — the same signal
  // use-seat-gate latches `hasPlayedHere` from — so add it back explicitly.
  const seated = gate.seated || decision?.seated === true || placedBets.length > 0;
  const floor = seated ? block : enter;

  const warnLow =
    token !== "demo" &&
    // `enforced: false` = no server rule gates this player (seamless wallet,
    // null balance, all floors 0). Inventing a floor for them is the client
    // making up a money rule the server does not have.
    decision?.enforced === true &&
    // A server that answered but sent no thresholds would fall back to the
    // compile-time default here, i.e. a figure nobody configured. Say nothing.
    thresholds != null &&
    // Below the floor is the GATE's job — it covers the screen and names the
    // number. `unresolved` is not a licence to guess either: fail OPEN for
    // display, because the server refuses the bets and cuts the video whatever
    // this browser happens to believe.
    gate.state === "open" &&
    balanceLoaded &&
    balance >= floor &&
    balance < warn;

  return {
    warnLow,
    floor,
    text: t("seat.warnLow", { amount: formatMoney(floor, currency) }),
  };
}
