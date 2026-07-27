"use client";

import { useIsMobile } from "@/lib/use-mobile";
import { useVisibleHeight } from "@/lib/use-visible-height";
import { useGame } from "@/lib/game-context";
import { useIdleSession } from "@/lib/use-idle-kick";
import { useCountdown } from "@/lib/use-countdown";
import { useFeatures } from "@/lib/use-features";
import PlayerHeader from "./PlayerHeader";
import LiveChat from "./LiveChat";
import MobileChat from "./MobileChat";
import SideBets from "./SideBets";
import MainBets from "./MainBets";
import BaccaratTable from "./BaccaratTable";
import BalanceBar from "./BalanceBar";
import RoadmapPanel from "./RoadmapPanel";
import DealVisualizer from "./DealVisualizer";
import VideoPlayer from "./VideoPlayer";
import RoundCountdown from "./RoundCountdown";
import TableInfoBar from "./TableInfoBar";
import { PAD_CARD_KEYFRAMES } from "./PadCards";
import VideoQuickIcons from "./VideoQuickIcons";
import WinnersMarquee from "./WinnersMarquee";
import FlyingChips from "./FlyingChips";
import WinFlash from "./WinFlash";
import LowBalanceGate from "./LowBalanceGate";

/**
 * Inline keyframes for the betting-open pulse on the bet panel border.
 * Tone matches the Tie color (#00bc7d) so it's instantly recognizable.
 */
const BET_PANEL_STYLES = `
@keyframes prgBetPanelPulse {
  0% {
    box-shadow: 0 0 0 1px rgba(0, 188, 125, 0.55), 0 0 14px rgba(0, 188, 125, 0.35);
    border-color: rgba(0, 188, 125, 0.55);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(0, 188, 125, 0.95), 0 0 28px rgba(0, 188, 125, 0.75);
    border-color: rgba(0, 188, 125, 0.95);
  }
  100% {
    box-shadow: 0 0 0 1px rgba(0, 188, 125, 0.55), 0 0 14px rgba(0, 188, 125, 0.35);
    border-color: rgba(0, 188, 125, 0.55);
  }
}
.prg-bet-panel--open {
  animation: prgBetPanelPulse 2s ease-in-out infinite;
}
/* Red pulse — same rhythm, urgent colour. Used when the player is one or two
   rounds from being kicked, and when the countdown itself has gone red. Both
   mean "act now", so the panel should not be reassuring green while the clock
   is red at the other side of the screen. */
@keyframes prgBetPanelPulseUrgent {
  0%, 100% {
    box-shadow: 0 0 0 1px rgba(251, 44, 54, 0.55), 0 0 14px rgba(251, 44, 54, 0.35);
    border-color: rgba(251, 44, 54, 0.55);
  }
  50% {
    box-shadow: 0 0 0 2px rgba(251, 44, 54, 0.95), 0 0 28px rgba(251, 44, 54, 0.75);
    border-color: rgba(251, 44, 54, 0.95);
  }
}
.prg-bet-panel--urgent {
  animation: prgBetPanelPulseUrgent 1.4s ease-in-out infinite;
}
.prg-bet-panel--closed {
  border-color: rgba(54, 65, 83, 0.6) !important;
  box-shadow: none;
  animation: none;
}
`;

/**
 * Mobile height budget. These are the parts that must never be squeezed: the
 * header (one row of controls) and the pinned info strip at the foot. What's
 * left is shared out between the video, the road and the chat/winners row —
 * in that order of how much each may give up.
 */
const MOBILE_INFOBAR_H = 72;
/** Below this the video stops being a video. */
const MOBILE_VIDEO_MIN_H = 132;
/**
 * Below this the road stops being readable. The panel spends ~70px on its
 * title and the Next/standings line, so this leaves the grid roughly 70px —
 * six rows of ~11px cells, which is small but still a road.
 */
const MOBILE_ROAD_MIN_H = 140;
/**
 * The road's preferred height, stated rather than derived.
 *
 * It has to be a definite flex-basis: the grid now sizes its cells FROM the
 * height it is given, so leaving the basis as `auto` would ask the box how tall
 * it wants to be while the answer depends on how tall it ends up. This is the
 * height 6 rows came to at the old width-driven sizing, so nothing moves on a
 * screen that already had the room.
 */
const MOBILE_ROAD_PREF_H = 208;

export default function PlayerLayout() {
  const isMobile = useIsMobile();
  // The height actually on screen — NOT `100vh`. Inside an operator's iframe
  // our viewport runs off the bottom of the phone, under their navigation and
  // the browser's own bars. See lib/use-visible-height.
  const visibleH = useVisibleHeight();
  const { roundStatus, webrtcUrl, hlsUrl } = useGame();
  const { live_chat_enabled: liveChatEnabled } = useFeatures();
  // While the hand is being dealt, give the video more room: betting is closed,
  // so the bet panel has nothing the player can act on, and the deal is the only
  // thing worth looking at. Restores itself when the next round opens.
  const dealing = roundStatus === "dealing" || roundStatus === "result";

  const isBettingOpen = roundStatus === "betting_open";
  // The panel turns red when there is a reason to hurry: an idle warning is
  // active (a round or two from losing the seat) OR the countdown has gone red.
  // RoundCountdown flips red at <= 5s, so the same threshold is used here rather
  // than a second, differing definition of "urgent".
  const { warnLevel } = useIdleSession();
  const secondsLeft = useCountdown();
  // Note the missing `> 0`. The round stays `betting_open` for a moment after
  // the clock reaches zero — the studio closes it server-side — and requiring a
  // positive value meant the panel dropped out of urgent at 0 and flipped BACK to
  // a calm green pulse for those seconds. Green after the clock has run out
  // reads as "you still have time", which is the opposite of true.
  const clockUrgent = secondsLeft !== null && secondsLeft <= 5;
  const urgent = isBettingOpen && (warnLevel > 0 || clockUrgent);
  const panelClass = !isBettingOpen
    ? "prg-bet-panel--closed"
    : urgent
      ? "prg-bet-panel--urgent"
      : "prg-bet-panel--open";

  if (isMobile) {
    return (
      <div
        className="player-layout"
        style={{
          display: "flex",
          flexDirection: "column",
          // Fit the space we can actually see. Before the measurement lands
          // (first paint, SSR) fall back to `100dvh` — still better than
          // `100vh`, which ignores the phone's collapsing URL bar.
          height: visibleH ? `${visibleH}px` : "100dvh",
          // The video and the road absorb the shortfall (they carry
          // `flexShrink`), so the column fits rather than spilling. `auto`
          // rather than `hidden` is the safety net: on a screen too short for
          // even the minimums, a scroll is bad but unreachable bet pads are
          // worse — and that is exactly what a hard clip would produce.
          overflowY: "auto",
          overflowX: "hidden",
          // Felt on the body, under everything below the video. Painted as the
          // container's own BACKGROUND rather than a stacked layer: an extra
          // positioned element needed a blanket `z-index: 1` on its siblings to
          // sit behind them, and that created a stacking context around every
          // child — which trapped the fixed chat sheet underneath the header and
          // the footer. backgroundAttachment: fixed keeps it still while the
          // page scrolls, which is what the layer was for.
          // Dim matched to the desktop backdrop (0.4). It was 0.72 here, which
          // is why mobile looked markedly darker than desktop for the same art.
          backgroundImage:
            "linear-gradient(rgba(3,7,18,0.4), rgba(3,7,18,0.4)), url(/stream-bg.png)",
          // Fit the WIDTH and tile downward instead of `cover`. The art is
          // 1672x941 (landscape); on a 430x932 phone `cover` scales it to fill
          // the height and shows only ~26% of its width — hence the blown-up,
          // cropped look. Width-fitting keeps it at its intended scale.
          backgroundSize: "100% auto",
          backgroundRepeat: "repeat-y",
          backgroundPosition: "top center",
          backgroundAttachment: "fixed",
          backgroundColor: "#030712",
          position: "relative",
        }}
      >
        {/* Keyframes for the bet-panel pulse and the pad card/win animations.
            Both were lost when the felt backdrop layer was removed, which left
            the panel pulse and the winner glow referencing animations that did
            not exist — silently, since a missing @keyframes just does nothing. */}
        <style>{BET_PANEL_STYLES}</style>
        <style>{PAD_CARD_KEYFRAMES}</style>

        {/* Header — sticky */}
        {/* z ABOVE the pinned TableInfoBar (60). PlayerMenu renders inside this
            header, so the header's stacking context caps it: at 50 the menu's
            own z-120 was still trapped below the info bar and the footer painted
            over the open menu. */}
        <div style={{ position: "sticky", top: 0, zIndex: 70, flexShrink: 0 }}>
          <PlayerHeader />
        </div>

        {/* Video / Deal area — 16:9 when there's room for it. It briefly
            widened to 4:3 during the deal; that just cropped the table and
            shoved the page around for no gain, so the feed stays put and the
            pads alone carry the hand.

            It SHRINKS now — 16:9 is the ceiling, not a contract — but it is
            the most RELUCTANT block on the page (flexShrink 1, against 2 for
            the road and 3 for the chat row). The feed is `object-contain` by
            deliberate choice, so a shorter box does not crop it, it shrinks the
            whole frame: squeeze the box hard and the dealer pillarboxes down to
            a third of the width. Letting the road give ground first keeps the
            feed watchable, which on a live-dealer table is the product. */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "16 / 9",
            background: "#000",
            overflow: "hidden",
            flexGrow: 0,
            flexShrink: 1,
            minHeight: MOBILE_VIDEO_MIN_H,
          }}
        >
          <VideoPlayer
            webrtcUrl={webrtcUrl}
            hlsUrl={hlsUrl}
            fallback={<DealVisualizer />}
          />
          <RoundCountdown />
          <LowBalanceGate />
        </div>

        {/* Roadmap — moved ABOVE the bet panel so the road is the first
            thing the player sees after the video stream. Players asked for
            this hierarchy because the road is what they consult before
            betting; previously they had to scroll past the bet buttons. */}
        <div
          style={{
            padding: "8px 19px 0 19px",
            // Gives ground BEFORE the video does (shrink 2 vs 1), down to a
            // floor that keeps the grid legible. The road degrades gracefully —
            // smaller circles, same information — where the video degrades into
            // a postage stamp. RoadmapPanel fills whatever it gets and scales
            // the road's cells to match.
            flexGrow: 0,
            flexShrink: 2,
            flexBasis: MOBILE_ROAD_PREF_H,
            minHeight: MOBILE_ROAD_MIN_H,
            display: "flex",
          }}
        >
          <RoadmapPanel />
        </div>

        {/* Bet panel — wraps Balance + Side Bets + Main Bets so the pulse outlines the whole area */}
        <div
          className={panelClass}
          style={{
            margin: "10px 19px 12px 19px",
            padding: 10,
            borderRadius: 16,
            border: "1.5px solid rgba(54, 65, 83, 0.6)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            // NEVER shrinks. This is the only part of the page the player acts
            // on; the reported bug was the bet pads clipped off the bottom of
            // the screen. Everything above gives way before this does.
            flexShrink: 0,
          }}
        >
          {/* BalanceBar renders the balance + CLEAR BETS (right, above chips)
              + the chip row with the ×2 toggle. */}
          <BalanceBar />

          <SideBets />
          <MainBets />
        </div>

        {/* Live Chat — EVO-style floating button + translucent bottom sheet.
            Gated on the admin live_chat_enabled feature flag. */}

        {/* The Player/Banker score-card panel is GONE on mobile: the pads
            themselves now show the per-card draws and the result during the
            deal, so this was the same information twice — and it cost a scroll
            to reach. Desktop keeps it (its pads are unchanged).

            The spacer remains to reserve room for the pinned TableInfoBar so it
            never covers the last row of content. */}
        {/* The space the score-card panel used to take, split in two: chat on
            the LEFT (where sent messages now actually appear — previously they
            went nowhere visible once the sheet was closed) and winners on the
            RIGHT. Both unboxed, both off the video. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            padding: "8px 19px 0",
            alignItems: "start",
            // Was a hard `minHeight: 96` of reserved space. Both halves are
            // ambient (recent chat, recent winners) and neither is worth a bet
            // pad, so this collapses to nothing before the video or the road
            // are asked to shrink at all.
            flexGrow: 1,
            flexShrink: 3,
            flexBasis: 96,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Each side gets its OWN wrapper with an explicit column.

              Without them the grid had only one IN-FLOW child most of the time:
              MobileChat's sheet is position:fixed (out of flow) and its floats
              only exist while there are recent messages, so with the chat side
              empty auto-placement put the winners in column 1 — i.e. on the
              LEFT, which is exactly what it was moved off. */}
          <div style={{ gridColumn: 1, minWidth: 0 }}>
            {liveChatEnabled && <MobileChat />}
          </div>
          <div style={{ gridColumn: 2, minWidth: 0 }}>
            <WinnersMarquee inline />
          </div>
        </div>

        {/* Reserves room for the pinned TableInfoBar so it never covers
            content. Fixed: the strip is a real, opaque thing at the foot of the
            screen, so shrinking its reservation just puts it back on top of the
            bet pads. */}
        <div
          style={{
            // The strip's OWN measured height (it publishes it), not a guess.
            // The guess was 72px for a ~38px bar and the difference came out of
            // the video and the road, which are the two things short on room.
            // The safe-area term is already inside the measurement — the bar
            // pads itself for the home indicator — so it is not added twice.
            height: `var(--prg-infobar-h, calc(${MOBILE_INFOBAR_H}px + env(safe-area-inset-bottom, 0px)))`,
            flexShrink: 0,
          }}
          aria-hidden
        />

        <FlyingChips />
        <WinFlash />

        {/* Pinned to the bottom of the VIEWPORT, Evolution-style — not to the end
            of the scroll, where it would only appear after scrolling past the
            score cards. The scroll container reserves matching space below so it
            never covers the last row of content. */}
        <TableInfoBar fixed />
      </div>
    );
  }

  // Desktop layout
  return (
    <div
      className="h-screen overflow-hidden"
      style={{
        display: "grid",
        // 4th row = the bottom info strip. Declared EXPLICITLY: adding a
        // fourth child to a three-row template made the grid invent an
        // implicit row and collapsed the video row into a huge gap.
        // Desktop keeps a fixed layout: the video-expand/pad-takeover behaviour
        // is mobile-only, where screen space is actually scarce.
        gridTemplateRows: "5.5vh 1fr 30vh auto",
        background: "#0a0f1a",
      }}
    >
      <style>{BET_PANEL_STYLES}</style>
      <style>{PAD_CARD_KEYFRAMES}</style>

      <PlayerHeader />

      <div className="relative min-h-0 overflow-hidden bg-black flex items-center justify-center">
        <VideoPlayer
          webrtcUrl={webrtcUrl}
          hlsUrl={hlsUrl}
          fallback={<DealVisualizer />}
        />
        <RoundCountdown />
        <WinnersMarquee />
        <LowBalanceGate />
        <VideoQuickIcons />
        {liveChatEnabled && <LiveChat />}
      </div>

      <div
        className="min-h-0 overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: "22% 44% 32%",
          gap: "0.5vw",
          padding: "0.4vh 16px",
        }}
      >
        <div className="min-h-0 overflow-hidden">
          <RoadmapPanel />
        </div>
        <div
          className={`min-h-0 overflow-hidden ${panelClass}`}
          style={{
            display: "grid",
            gridTemplateRows: "25% 28% 1fr",
            gap: "0.4vh",
            padding: "0.4vh 0.5vw",
            borderRadius: "0.7vw",
            border: "1.5px solid rgba(54, 65, 83, 0.6)",
            transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            position: "relative",
          }}
        >
          {/* Clear bets is rendered inline inside BalanceBar so it sits
              in the same row as the chips, in the space between balance
              and the chip selector. */}
          <BalanceBar />
          <SideBets />
          <MainBets />
        </div>
        <div className="min-h-0 overflow-hidden">
          <BaccaratTable />
        </div>
      </div>

      <TableInfoBar />

      <FlyingChips />
      <WinFlash />
    </div>
  );
}
