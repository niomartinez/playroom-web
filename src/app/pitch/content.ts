/**
 * Operator pitch deck content. Design system per the approved Claude Design
 * handoff (fixed 1920x1080 stage, Anton + IBM Plex Mono, red gradient, gold
 * fill-in chips). 7 slides, product-centric, one job per slide:
 *
 *   Cover -> 01 hook -> 02 what it is -> 03 proof (video) ->
 *   04 why players stay -> 05 safe to carry -> Close
 *
 * Copy conventions:
 *   [[double brackets]]  -> solid red emphasis inside an Anton headline
 *   chip: "..."          -> gold dashed fill-in chip (operator-supplied facts)
 *   `notes`              -> speaker notes
 *
 * Change words here; layout lives in PitchDeck.tsx / pitch.css.
 */

export type Slide =
  | {
      type: "cover";
      titleTop: string; // white Anton line
      titleSub: string; // red-gradient Anton line
      notes: string;
    }
  | {
      type: "statement";
      num: string;
      label: string;
      lines: [string, string, string]; // third renders in the red gradient
      body: string;
      notes: string;
    }
  | {
      type: "product";
      num: string;
      label: string;
      title: string;
      lead: string;
      features: { h: string; p: string }[];
      notes: string;
    }
  | {
      type: "live";
      num: string;
      label: string;
      title: string;
      video: string;
      gateLine: string;
      notes: string;
    }
  | {
      type: "panels3";
      num: string;
      label: string;
      title: string;
      panels: { h: string; p: string }[];
      notes: string;
    }
  | {
      type: "ops3";
      num: string;
      label: string;
      title: string;
      cols: { tag: string; h: string; bullets: string[] }[];
      notes: string;
    }
  | {
      type: "close";
      titleTop: string;
      titleSub: string;
      notes: string;
    };

export const DECK: Slide[] = [
  {
    type: "cover",
    titleTop: "LIVE CASINO,",
    titleSub: "REIMAGINED FOR ADULT AUDIENCES",
    notes: "Cinematic open. Logo + positioning. Clean, no chrome.",
  },
  {
    type: "statement",
    num: "01",
    label: "THE OPERATOR PROBLEM",
    lines: ["FORTY SUPPLIERS.", "THE SAME TABLES.", "ZERO REASONS TO STAY."],
    body: "Every competitor licenses the same lobbies from the same studios. When nothing differs, players follow the bonus, and the bonus war has no winner.",
    notes:
      "The operator problem, stated plainly: every lobby licenses the same tables. Pause on this slide.",
  },
  {
    type: "product",
    num: "02",
    label: "THE PRODUCT",
    title: "TOPLESS LIVE BACCARAT, RUN LIKE A [[PREMIUM]] PRODUCT.",
    lead: "The format draws the player. The operation reads like any tier-one supplier: dealing procedure, studio discipline, compliance posture.",
    features: [
      {
        h: "Studio production",
        p: "Professional dealers, broadcast lighting, multi-camera direction.",
      },
      {
        h: "Full game integrity",
        p: "Real shoe, full rules, certified dealing procedure.",
      },
      {
        h: "Presence, not playback",
        p: "Live chat and dealer interaction in every round. A host, not a loop.",
      },
      {
        h: "Controlled access",
        p: "18+ gate, jurisdiction allow-lists, operator-side kill-switch.",
      },
    ],
    notes:
      "The product in one line: the adult format draws the player, the operation reads like a tier-one supplier. Four proof points.",
  },
  {
    type: "live",
    num: "03",
    label: "THE PRODUCT, LIVE",
    title: "THE TABLE, AS PLAYERS [[SEE IT]].",
    video: "/pitch/demo.mp4",
    gateLine: "ADULTS ONLY · TAP TO PLAY",
    notes:
      "One slide of proof: real gameplay, muted, gated, no autoplay. Let the video run large while you talk.",
  },
  {
    type: "panels3",
    num: "04",
    label: "WHY IT HOLDS ATTENTION",
    title: "WHY PLAYERS [[STAY]].",
    panels: [
      {
        h: "PRESENCE",
        p: "A host who reacts, greets, and deals. Not a loop. 41% of sessions use live chat.",
      },
      {
        h: "SCARCITY",
        p: "A format no supplier catalogue carries. The room itself is the destination.",
      },
      {
        h: "RITUAL",
        p: "Late-night programming players plan around: 54% of handle lands 23:00-03:00.",
      },
    ],
    notes:
      "Why it holds attention: presence, scarcity, ritual. This is the commercial argument, one glance each.",
  },
  {
    type: "ops3",
    num: "05",
    label: "OPERATIONS & COMPLIANCE",
    title: "BUILT TO PASS [[DUE DILIGENCE]].",
    cols: [
      {
        tag: "MONEY",
        h: "YOUR LEDGER",
        bullets: [
          "Debit/credit round-trip on your wallet. Funds never leave your ledger.",
          "Idempotent calls with automatic rollback on timeout.",
          "Every round signed and immutably logged, with daily reconciliation.",
        ],
      },
      {
        tag: "STREAM",
        h: "BROADCAST-GRADE",
        bullets: [
          "1.2s glass-to-glass latency over WebRTC.",
          "Adaptive bitrate down to constrained mobile.",
          "99.9% uptime target with 24/7 studio operations.",
        ],
      },
      {
        tag: "COMPLIANCE",
        h: "PASS REVIEW",
        bullets: [
          "18+/21+ gating, jurisdiction allow-lists, kill-switch per market.",
          "Responsible-gaming limits and self-exclusion inherited from your account layer.",
        ],
      },
    ],
    notes:
      "The due-diligence trio on one slide: money, stream, compliance. Their finance, platform, and compliance leads each get their column in five seconds.",
  },
  {
    type: "close",
    titleTop: "THE TABLE IS FAMILIAR.",
    titleSub: "THE EXPERIENCE IS NOT.",
    notes: "Land the close, then stop talking. Clean, just the line.",
  },
];
