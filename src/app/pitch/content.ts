/**
 * Operator pitch deck content, transcribed from the APPROVED Claude Design
 * handoff (PRG Deck Handoff / "Playroom Pitch Deck.dc.html", Jul 2026).
 * The design canvas is a fixed 1920x1080 stage; sizes in pitch.css are in
 * that space and the whole stage scales to the viewport.
 *
 * Copy conventions carried over from the design:
 *   [[double brackets]]  -> solid red emphasis inside an Anton headline
 *   chip: "..."          -> gold dashed fill-in chip (operator-supplied facts:
 *                           citations, odds, SLA, dates, contacts)
 *   `notes`              -> the designer's speaker notes (data-speaker-notes)
 *
 * Change words here; layout lives in PitchDeck.tsx / pitch.css.
 */

export type MainBet = { label: string; odds: string; color: string };

export type Slide =
  | {
      type: "cover";
      kicker: [string, string];
      titleTop: string; // white Anton line
      titleSub: string; // red-gradient Anton line
      preparedForPrefix: string; // operator name appended at runtime
      legal: string;
      notes: string;
    }
  | {
      type: "market";
      num: string;
      label: string;
      title: string;
      cards: { big: string; cap: string }[];
      sourcesChip: string;
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
      type: "showcase";
      num: string;
      label: string;
      title: string;
      fullShot: { src: string; cap: string; gateLine: string };
      crops: { src: string; cap: string; cropHeight?: number }[];
      notes: string;
    }
  | {
      type: "demo";
      num: string;
      label: string;
      title: string;
      video: string;
      gateLine: string;
      capLeft: string;
      capRight: string;
      notes: string;
    }
  | {
      type: "caseStudy";
      num: string;
      label: string;
      title: string;
      steps: { day: string; h: string; p: string; bright?: boolean }[];
      stats: { big: string; cap: string }[];
      chip: string;
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
      type: "betMenu";
      num: string;
      label: string;
      title: string;
      lead: string;
      mains: MainBet[];
      pairs: { odds: string; label: string }[];
      footNote: string;
      chip: string;
      notes: string;
    }
  | {
      type: "integration";
      num: string;
      label: string;
      title: string;
      strip: string[]; // node names; the "active" one is marked below
      stripActive: number;
      cols: { h: string; p: string }[];
      notes: string;
    }
  | {
      type: "wallet";
      num: string;
      label: string;
      title: string;
      panels: { h: string; bullets: string[] }[];
      notes: string;
    }
  | {
      type: "bigStats";
      num: string;
      label: string;
      title: string;
      stats: { big: string; cap: string; p: string }[];
      chip: string;
      notes: string;
    }
  | {
      type: "roadmap";
      num: string;
      label: string;
      title: string;
      phases: {
        tag: string;
        dateChip?: string; // gold chip after the tag
        live?: boolean; // pulsing bright dot + red tag
        h: string;
        p: string;
      }[];
      notes: string;
    }
  | {
      type: "compliance";
      num: string;
      label: string;
      title: string;
      lead: string;
      items: { h: string; p: string; chip?: string }[];
      notes: string;
    }
  | {
      type: "commercials";
      num: string;
      label: string;
      title: string;
      panels: { h: string; rows: { k: string; chip: string }[] }[];
      footNote: string;
      notes: string;
    }
  | {
      type: "close";
      kicker: [string, string];
      titleTop: string;
      titleSub: string;
      chips: string[];
      legal: string;
      notes: string;
    };

export const FOOTER = "PLAYROOM GAMING · OPERATOR DECK";

export const DECK: Slide[] = [
  {
    type: "cover",
    kicker: ["PLAYROOM GAMING", " · OPERATOR BRIEFING"],
    titleTop: "LIVE CASINO,",
    titleSub: "REIMAGINED FOR ADULT AUDIENCES",
    preparedForPrefix: "PREPARED FOR: ",
    legal: "18+ / 21+ where required",
    notes:
      "Cinematic open. Logo, positioning, legal line. The gold chip marks where the operator's name gets filled in before each send.",
  },
  {
    type: "market",
    num: "01",
    label: "THE MARKET",
    title: "LIVE CASINO IS iGAMING'S [[FASTEST-GROWING]] VERTICAL.",
    cards: [
      { big: "€30B+", cap: "GLOBAL LIVE-DEALER GGR" },
      { big: "+11%", cap: "CAGR THROUGH 2030" },
      { big: "35%", cap: "OF ONLINE CASINO REVENUE" },
      { big: "70%", cap: "OF GGR FROM VIP-TIER PLAYERS" },
    ],
    sourcesChip: "CONFIRM CITATIONS: H2GC / OPERATOR REPORTS",
    notes:
      "Frame the category: live casino is where iGaming growth is. Confirm the citations before sending; the chip marks it.",
  },
  {
    type: "statement",
    num: "02",
    label: "THE OPERATOR PROBLEM",
    lines: ["FORTY SUPPLIERS.", "THE SAME TABLES.", "ZERO REASONS TO STAY."],
    body: "Every competitor licenses the same lobbies from the same studios. When nothing differs, players follow the bonus, and the bonus war has no winner.",
    notes:
      "The operator problem, stated plainly: every lobby licenses the same tables. Pause on this slide.",
  },
  {
    type: "product",
    num: "03",
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
        p: "Real shoe, full rules, complete side-bet menu, certified procedure.",
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
    type: "showcase",
    num: "04",
    label: "THE PRODUCT, LIVE",
    title: "THE TABLE, AS PLAYERS [[SEE IT]].",
    fullShot: {
      src: "/pitch/screen-full.jpg",
      cap: "FULL TABLE VIEW · GATED",
      gateLine: "TAP TO REVEAL · FULL TABLE VIEW",
    },
    crops: [
      { src: "/pitch/ui-betmenu.png", cap: "BET MENU · BALANCE · CHIP RAIL" },
      {
        src: "/pitch/ui-chat.png",
        cap: "LIVE CHAT · PRESENCE IN EVERY ROUND",
        cropHeight: 250,
      },
    ],
    notes:
      "Real product. Full table view is gated; click to reveal in the room when appropriate. The UI crops on the right are safe and show what the operator is actually buying: the platform.",
  },
  {
    type: "demo",
    num: "05",
    label: "GAMEPLAY",
    title: "LIVE GAMEPLAY, [[UNCUT]].",
    video: "/pitch/demo.mp4",
    gateLine: "ADULTS ONLY · TAP TO PLAY",
    capLeft: "STUDIO ONE · BACCARAT TABLE 1",
    capRight: "AUDIO MUTED FOR PRESENTATION",
    notes:
      "Gameplay capture, muted, gated, no autoplay. Reveal only in the room. The frame is cropped to the Playroom interface.",
  },
  {
    type: "caseStudy",
    num: "06",
    label: "CASE STUDY: INTEGRATION · EU MULTI-BRAND GROUP",
    title: "CREDENTIALS TO FIRST LIVE ROUND IN [[TEN DAYS]].",
    steps: [
      { day: "DAY 0", h: "ACCESS", p: "API credentials, docs, and sandbox tables issued." },
      {
        day: "DAY 3",
        h: "WALLET CERTIFIED",
        p: "Seamless-wallet round-trip passed on first submission.",
      },
      {
        day: "DAY 7",
        h: "STAGING SIGN-OFF",
        p: "Operator compliance and UX review cleared.",
      },
      {
        day: "DAY 10",
        h: "FIRST LIVE ROUND",
        p: "Real-money play opened to production players.",
        bright: true,
      },
    ],
    stats: [
      { big: "0", cap: "WALLET DISCREPANCIES · FIRST 30 DAYS" },
      { big: "1", cap: "ENGINEERING SPRINT, ONE TEAM" },
      { big: "99.9%", cap: "STREAM UPTIME SINCE LAUNCH" },
    ],
    chip: "ILLUSTRATIVE: REPLACE WITH SIGNED OPERATOR DATA",
    notes:
      "Case study: integration speed. EU multi-brand group on a standard API: credentials day 0, wallet certified day 3, staging day 7, live day 10. Zero wallet discrepancies. Figures illustrative.",
  },
  {
    type: "panels3",
    num: "07",
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
      "Why it holds attention: presence, scarcity, ritual. This is the product argument behind the case-study numbers.",
  },
  {
    type: "betMenu",
    num: "08",
    label: "THE BET MENU",
    title: "A BET MENU BUILT FOR [[DEPTH]].",
    lead: "Thirteen markets per hand: mains, pairs, and premium sides keep every round bettable.",
    mains: [
      { label: "PLAYER", odds: "1:1", color: "#2b7fff" },
      { label: "TIE", odds: "8:1", color: "#00bc7d" },
      { label: "BANKER", odds: "0.95:1", color: "#fb2c36" },
    ],
    pairs: [
      { odds: "25:1", label: "PERFECT PAIR" },
      { odds: "11:1", label: "PLAYER PAIR" },
      { odds: "11:1", label: "BANKER PAIR" },
      { odds: "5:1", label: "EITHER PAIR" },
    ],
    footNote: "+6 PREMIUM SIDES · CONFIGURABLE PER MARKET",
    chip: "CONFIRM FINAL ODDS",
    notes:
      "The deep bet menu is a commercial asset: 13 markets per hand. Mains use the product's bet colors. Confirm final odds per jurisdiction before sending.",
  },
  {
    type: "integration",
    num: "09",
    label: "INTEGRATION",
    title: "ONE SPRINT, [[STANDARD API]].",
    strip: ["OPERATOR", "PLAYROOM API", "WALLET", "LIVE STUDIO", "REPORTING"],
    stripActive: 1,
    cols: [
      {
        h: "Industry-standard contract",
        p: "An API shape your team already integrates. The port is mechanical.",
      },
      {
        h: "Sandbox on day 0",
        p: "Credentials, docs, and test tables before the kickoff call ends.",
      },
      {
        h: "One call-pattern",
        p: "Bets, results, rollbacks: the same wallet contract on every table.",
      },
    ],
    notes:
      "Integration is not an engineering project: industry-standard API shape, sandbox on day 0, one wallet call-pattern. Walk the architecture strip left to right.",
  },
  {
    type: "wallet",
    num: "10",
    label: "WALLET & SETTLEMENT",
    title: "MONEY MOVES [[CLEANLY]].",
    panels: [
      {
        h: "SEAMLESS WALLET",
        bullets: [
          "Debit/credit round-trip on your wallet. Funds never leave your ledger.",
          "Idempotent calls with automatic rollback on timeout.",
          "Real-time balance sync across product and lobby.",
          "Single integration shared by every Playroom table.",
        ],
      },
      {
        h: "SETTLEMENT INTEGRITY",
        bullets: [
          "Every round signed and immutably logged.",
          "Automated daily reconciliation reports.",
          "Dispute tooling with per-round video reference.",
          "Variances page both sides automatically, with a zero-discrepancy target.",
        ],
      },
    ],
    notes:
      "Money never leaves the operator's ledger. Seamless wallet on the left, settlement integrity on the right; this is the slide for their finance and platform leads.",
  },
  {
    type: "bigStats",
    num: "11",
    label: "LIVE VIDEO",
    title: "BROADCAST-GRADE [[DELIVERY]].",
    stats: [
      {
        big: "1.2S",
        cap: "GLASS-TO-GLASS LATENCY",
        p: "WebRTC-first, adaptive bitrate down to constrained mobile.",
      },
      {
        big: "3X",
        cap: "REDUNDANT STREAM PATHS",
        p: "Automatic failover between encoders and CDNs, mid-round.",
      },
      {
        big: "99.9%",
        cap: "UPTIME TARGET",
        p: "24/7 studio operations with monitored dealer rotations.",
      },
    ],
    chip: "VERIFY SLA FIGURES WITH OPS",
    notes:
      "Broadcast-grade delivery: low latency, redundant paths, uptime target. Verify the SLA figures with ops before an external send.",
  },
  {
    type: "panels3",
    num: "12",
    label: "OPERATOR VALUE",
    title: "WHAT IT DOES FOR [[YOUR P&L]].",
    panels: [
      {
        h: "A NEW VERTICAL",
        p: "Incremental GGR from a lobby position no aggregator sells, without cannibalizing your live mix.",
      },
      {
        h: "VIP ECONOMICS",
        p: "The premium format concentrates high-value players. ARPU and session length follow.",
      },
      {
        h: "A STORY TO RUN",
        p: "Acquisition and CRM campaigns competitors cannot copy-paste next week.",
      },
    ],
    notes:
      "Commercial value: a new vertical, VIP economics, and a marketing story competitors can't copy. This is the CFO slide.",
  },
  {
    type: "roadmap",
    num: "13",
    label: "ROADMAP",
    title: "FOUR PHASES, ONE [[STUDIO]].",
    phases: [
      {
        tag: "PHASE 01 · LIVE NOW",
        live: true,
        h: "BACCARAT, STUDIO ONE",
        p: "Topless live baccarat, Table 1, dealing today.",
      },
      {
        tag: "PHASE 02 · ",
        dateChip: "Q3 '26",
        h: "MORE TABLES",
        p: "Second table, dealer rotation, extended hours.",
      },
      {
        tag: "PHASE 03 · ",
        dateChip: "Q4 '26",
        h: "LOCALIZATION",
        p: "Localized dealers and languages per market.",
      },
      {
        tag: "PHASE 04 · ",
        dateChip: "POSSIBLY '26",
        h: "DEDICATED TABLES",
        p: "Operator-branded private rooms, your players only.",
      },
    ],
    notes:
      "Four phases from today's live baccarat to operator-branded private tables. Dates are gold chips; set them per conversation.",
  },
  {
    type: "compliance",
    num: "14",
    label: "TRUST & COMPLIANCE",
    title: "DESIGNED TO PASS [[REVIEW]].",
    lead: "Built assuming your compliance team reads it first.",
    items: [
      {
        h: "Age & geo controls",
        p: "18+/21+ gating, jurisdiction allow-lists, operator kill-switch per market.",
      },
      {
        h: "Game integrity",
        p: "Certified equipment and dealing procedure: ",
        chip: "ADD TESTING LAB",
      },
      {
        h: "Responsible gaming",
        p: "Limits, reality checks, and self-exclusion inherited from your wallet and account layer.",
      },
    ],
    notes:
      "The risk-defusing slide. Built assuming their compliance team reads it first. The lab chip gets filled with real certifications before send.",
  },
  {
    type: "commercials",
    num: "15",
    label: "COMMERCIALS",
    title: "A [[SIMPLE]] DEAL.",
    panels: [
      {
        h: "MODEL",
        rows: [
          { k: "REVENUE SHARE", chip: "% TIERED BY GGR" },
          { k: "SETUP", chip: "FEE / WAIVED AT VOLUME" },
          { k: "BILLING", chip: "MONTHLY · CURRENCY" },
        ],
      },
      {
        h: "TERMS",
        rows: [
          { k: "EXCLUSIVITY", chip: "BY MARKET" },
          { k: "SLA", chip: "UPTIME + SUPPORT" },
          { k: "MINIMUM TERM", chip: "MONTHS" },
        ],
      },
    ],
    footNote:
      "Commercials are tailored per market and volume. Final terms in the private demo.",
    notes:
      "Simple deal shape: revenue share, setup, billing on the left; exclusivity, SLA, term on the right. All chips; final terms live in the private demo.",
  },
  {
    type: "close",
    kicker: ["NEXT STEP", " · PRIVATE DEMO"],
    titleTop: "THE TABLE IS FAMILIAR.",
    titleSub: "THE EXPERIENCE IS NOT.",
    chips: ["NAME · TITLE", "EMAIL", "BOOK A PRIVATE DEMO"],
    legal: "18+ / 21+ where required",
    notes:
      "Land the close, then stop talking. Contacts and demo link are chips; fill before send.",
  },
];
