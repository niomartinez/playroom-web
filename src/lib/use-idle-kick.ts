"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "./game-context";
import { getIdleExempt, IDLE_EXEMPT_EVENT } from "./idle-exempt";
import { markSessionCut } from "./session-cut";
import { resolveIdlePolicy, type IdlePolicy } from "./idle-policy";
import { useSeatGate } from "./use-seat-gate";

/**
 * Idle-session policy for real-wallet players. Counts consecutive rounds with
 * no bet and escalates per the resolved {@link IdlePolicy}:
 *   - `warn1` idle rounds  → warnLevel 1 ("place bets to avoid removal")
 *   - `warn2` idle rounds  → warnLevel 2 ("place a bet to keep your seat")
 *   - `expire` idle rounds → expired (frozen "Session Expired" overlay)
 *
 * The thresholds are SERVER-OWNED — delivered in table state (idlePolicy) and
 * resolved in `idle-policy.ts`. A QA URL override is honoured off-prod only, so
 * a production player can't lengthen or disable their own freeze via the URL.
 *
 * Placing at least one bet in a round resets the counter. Demo mode is exempt.
 *
 * Unlike the previous behavior, this NEVER auto-redirects or closes the tab —
 * the UI (SessionGuard) freezes the game and lets the player return manually.
 */

export interface IdleSessionState {
  /** 0 = fine, 1 = first warning, 2 = final warning. */
  warnLevel: 0 | 1 | 2;
  /** True once the player has been removed for inactivity (frozen overlay). */
  expired: boolean;
}

export function useIdleSession(): IdleSessionState {
  const { token, roundStatus, currentRound, placedBets, confirmedBetRoundId, idlePolicy } = useGame();

  // Below the seat floor the player CANNOT bet — the server refuses on money.
  // Counting those rounds as inactivity charges them for the server's own rule,
  // and the resulting overlay tells them the wrong thing. Both the local counter
  // and the session-ended listener below defer to this. Read through a ref so
  // the round-transition effect doesn't need it in its dep list.
  const seatGated = useSeatGate().state === "blocked";
  const seatGatedRef = useRef(seatGated);
  seatGatedRef.current = seatGated;

  // The server value (idlePolicy) arrives from table-state recovery a moment
  // AFTER mount, so it's null on the first render. Resolving once on that
  // first render (the old bug) permanently pinned the client to the
  // compile-time default and the admin-set value never took effect. Instead:
  // seed with the default, then re-resolve in an effect whenever idlePolicy
  // lands. Effect (not render) keeps window.location out of the SSR pass.
  const [policy, setPolicy] = useState<IdlePolicy>(() => resolveIdlePolicy(null));
  useEffect(() => {
    setPolicy(resolveIdlePolicy(idlePolicy));
  }, [idlePolicy]);

  const [warnLevel, setWarnLevel] = useState<0 | 1 | 2>(0);
  const [expired, setExpired] = useState(false);

  /**
   * Whenever the seat is released — for ANY reason — order the video stopped.
   *
   * Relying on the player noticing a 401 was not enough: an ALREADY-ESTABLISHED
   * WHEP peer connection or HLS session makes no new authorised request, so no
   * 401 ever arrives and the picture keeps flowing behind the "Seat Released"
   * dialog. Since that dialog is a deletable DOM node, covering the video was
   * never enforcement.
   *
   * So the overlay and the teardown are driven by one fact: expired => stop.
   * VideoPlayer listens for this and tears the media down. Safe against a loop —
   * VideoPlayer's cutSession is idempotent, and this effect only fires on the
   * false -> true edge of `expired`.
   */
  useEffect(() => {
    if (!expired) return;
    markSessionCut();
  }, [expired]);

  // Server-authoritative session end: the bet route rejected with 1013
  // (idle stream-cut = full session end). Freeze immediately — the local
  // round counter may disagree (e.g. after a mid-idle client refresh that
  // didn't clear the server state in time).
  //
  // EXCEPT while seat-gated. The edge answers a bare 401 for BOTH cuts — idle
  // and seat-balance — and VideoPlayer turns any 401 into this event, so a
  // player below the floor was shown "Session Expired — inactivity" instantly,
  // with zero idle rounds elapsed. That is the fastest path to the reported
  // symptom and it is purely client-side.
  useEffect(() => {
    const onEnded = () => {
      if (seatGatedRef.current) return;
      setExpired(true);
    };
    window.addEventListener("playroom:session-ended", onEnded);
    return () => window.removeEventListener("playroom:session-ended", onEnded);
  }, []);

  const idleRoundsRef = useRef(0);
  const lastRoundIdRef = useRef<string | null>(null);
  const placedThisRoundRef = useRef(false);
  /** The round we joined during — forgiven once, mirroring the server. */
  const joinRoundRef = useRef<string | null>(null);

  // The exemption can arrive AFTER the client has already counted itself out:
  // the flag comes from the network (rejoin on mount, then every state poll), so
  // a slow or failed first call leaves the overlay up over a feed the server is
  // still happily serving. When the exemption turns on, retract the overlay and
  // reset the counter so the session behaves as the server actually treats it.
  useEffect(() => {
    const onExempt = (e: Event) => {
      const exempt = (e as CustomEvent<boolean>).detail;
      if (!exempt) return;
      idleRoundsRef.current = 0;
      setExpired(false);
      setWarnLevel(0);
    };
    window.addEventListener(IDLE_EXEMPT_EVENT, onExempt);
    return () => window.removeEventListener(IDLE_EXEMPT_EVENT, onExempt);
  }, []);

  // Clear an active warning the instant a chip goes down — responsive, and
  // harmless if the bet is later rejected (the warning just returns next
  // transition). This does NOT decide whether the round counts as active.
  useEffect(() => {
    if (placedBets.length > 0) {
      setWarnLevel((w) => (w === 0 ? w : 0));
    }
  }, [placedBets.length]);

  // What actually resets the idle counter: a bet the SERVER confirmed for the
  // current round. Keying off the optimistic placement let a rejected bet
  // (below min, over max, wallet 5xx) count as activity — so a player who
  // taps a rejected bet each round never idled out. With freeze now at a
  // single missed round, that gap was the whole rule.
  useEffect(() => {
    if (
      confirmedBetRoundId &&
      currentRound?.roundId != null &&
      String(currentRound.roundId) === confirmedBetRoundId
    ) {
      placedThisRoundRef.current = true;
    }
  }, [confirmedBetRoundId, currentRound?.roundId]);

  // Evaluate at every transition into a fresh betting_open round.
  useEffect(() => {
    if (token === "demo" || expired) return;
    // Server-declared exemption (long-lived/QA tokens): the server never cuts
    // these sessions, so the client must not warn or freeze them either.
    if (getIdleExempt()) return;
    if (roundStatus !== "betting_open" || !currentRound?.roundId) return;

    const newRoundId = String(currentRound.roundId);
    const prevRoundId = lastRoundIdRef.current;

    // Seat-gated: FREEZE the counter and re-arm the join grace, mirroring the
    // server's own skip branch (stream_session_service.evaluate_idle_for_fight).
    // Hiding the overlay without this only defers the kick — the moment the
    // player tops up, every round they were locked out for lands at once and
    // they are expired on the spot.
    if (seatGatedRef.current) {
      lastRoundIdRef.current = newRoundId;
      placedThisRoundRef.current = false;
      joinRoundRef.current = newRoundId;
      return;
    }

    // First round we observe — record it, and mark it as the JOIN round.
    if (!prevRoundId) {
      lastRoundIdRef.current = newRoundId;
      placedThisRoundRef.current = false;
      joinRoundRef.current = newRoundId;
      return;
    }

    // Same round (re-trigger) — ignore.
    if (prevRoundId === newRoundId) return;

    // Round transitioned. Evaluate the prior round's bet activity.
    if (placedThisRoundRef.current) {
      idleRoundsRef.current = 0;
      joinRoundRef.current = null;
    } else if (prevRoundId === joinRoundRef.current) {
      // JOIN GRACE, matching the server's.
      //
      // Not counting the transition INTO the join round was never enough: the
      // round itself was still evaluated as soon as the next one opened, so a
      // player who joined mid-round with no time to bet had it counted anyway.
      // The server forgives that round outright, so the client did too little
      // and ran a round AHEAD — showing the warning, and then the released-seat
      // overlay, one round before the server actually revoked.
      joinRoundRef.current = null;
    } else {
      idleRoundsRef.current += 1;
    }
    placedThisRoundRef.current = false;
    lastRoundIdRef.current = newRoundId;

    const idle = idleRoundsRef.current;
    if (idle >= policy.expire) {
      setExpired(true);
      setWarnLevel(0);
    } else if (policy.warn2 !== null && idle >= policy.warn2) {
      setWarnLevel(2);
    } else if (policy.warn1 !== null && idle >= policy.warn1) {
      setWarnLevel(1);
    } else {
      setWarnLevel(0);
    }
  }, [roundStatus, currentRound?.roundId, token, expired, policy]);

  return { warnLevel, expired };
}
