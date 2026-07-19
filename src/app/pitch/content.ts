/**
 * Operator pitch deck content.
 *
 * This is the ONLY file you should need to edit to change the words.
 * Anything wrapped in {{double braces}} renders as a gold "fill me in"
 * chip — those are the numbers/terms only Playroom can supply
 * (commercials, live metrics, contacts). Search this file for "{{" to
 * find every open placeholder before a real pitch.
 *
 * Wrap a word in [[double brackets]] to render it as an italic gold
 * emphasis inside a headline.
 *
 * Every factual claim here is grounded in the backend repo docs. Do not
 * add hard metrics (uptime %, table counts, volume) as plain text — keep
 * them as {{placeholders}} until they are real.
 */

export type Slide =
  | { type: "cover"; kicker: string; brand: [string, string]; title: string; sub: string; foot: { k: string; v: string }[] }
  | { type: "statement"; kicker: string; title: string; body: string }
  | { type: "pillars"; kicker: string; title: string; cards: { idx: string; h: string; p: string }[] }
  | { type: "feature"; kicker: string; title: string; lead?: string; items: string[] }
  | { type: "odds"; kicker: string; title: string; note: string; odds: { name: string; pay: string; accent?: "banker" | "player" | "tie" }[] }
  | { type: "split"; kicker: string; title: string; foot?: string; cols: { tag: string; h: string; p: string }[] }
  | { type: "stats"; kicker: string; title: string; lead?: string; stats: { num: string; lbl: string }[] }
  | { type: "steps"; kicker: string; title: string; steps: { h: string; p: string }[] }
  | { type: "close"; kicker: string; title: string; contacts: { k: string; v: string }[] };

export const DECK: Slide[] = [
  {
    type: "cover",
    kicker: "Live Dealer Baccarat · Game Provider",
    brand: ["PLAYROOM", "GAMING"],
    title: "Real baccarat, real dealers, built to the standard your platform [[already speaks]].",
    sub: "A live baccarat game provider you can put on your floor in days, not quarters.",
    foot: [
      { k: "Prepared for", v: "{{Operator name}}" },
      { k: "Presented by", v: "{{Your name}}" },
      { k: "Date", v: "{{Month YYYY}}" },
    ],
  },
  {
    type: "statement",
    kicker: "The Opportunity",
    title: "Baccarat is the table your players keep [[asking for]].",
    body: "In this region, live baccarat is the highest-trust, highest-retention format on the casino floor. Players want a real dealer, real cards, and a stream they can believe. When your platform cannot serve that, the demand quietly leaves to find it somewhere else.",
  },
  {
    type: "pillars",
    kicker: "What We Are",
    title: "A drop-in live baccarat studio for [[your platform]].",
    cards: [
      { idx: "01", h: "A real studio", p: "Live dealers dealing real cards in a broadcast studio, with every card machine-read for accuracy. Not an RNG animation." },
      { idx: "02", h: "A standard integration", p: "Built to the Evolution / EvoLive model your team likely already integrates against. The mental model transfers directly." },
      { idx: "03", h: "Full reconciliation", p: "Every bet, settlement, and dispute is traceable down to the peso, with reports and signed round links out of the box." },
    ],
  },
  {
    type: "feature",
    kicker: "The Product",
    title: "On the [[floor]].",
    lead: "A complete live baccarat table, engineered so the game never stalls and the numbers never drift.",
    items: [
      "Real dealers dealing real cards, with every card read by an Angel Eye shoe so the result is never in question.",
      "Sub-second HD video, with automatic fallback so the table never goes dark mid-shoe.",
      "A full bet menu: main bets, pairs, and premium side bets.",
      "A player interface that drops straight into your site as an iframe.",
    ],
  },
  {
    type: "odds",
    kicker: "The Bet Menu",
    title: "A full table, [[side bets included]].",
    note: "Odds and limits are configurable per table. Defaults shown.",
    odds: [
      { name: "Player", pay: "1 : 1", accent: "player" },
      { name: "Banker", pay: "0.95 : 1", accent: "banker" },
      { name: "Tie", pay: "8 : 1", accent: "tie" },
      { name: "Player Pair", pay: "11 : 1" },
      { name: "Banker Pair", pay: "11 : 1" },
      { name: "Either Pair", pay: "5 : 1" },
      { name: "Perfect Pair", pay: "25 : 1" },
      { name: "Super Six", pay: "12 : 1" },
      { name: "Dragon 7", pay: "40 : 1" },
      { name: "Panda 8", pay: "25 : 1" },
      { name: "Lucky 6", pay: "12 : 1" },
      { name: "Big Tiger", pay: "50 : 1" },
      { name: "Small Tiger", pay: "22 : 1" },
    ],
  },
  {
    type: "feature",
    kicker: "Integration",
    title: "You already speak our [[language]].",
    lead: "Playroom is built to the Evolution / EvoLive standard. If your platform integrates Evolution, the model carries over with almost no relearning.",
    items: [
      "Signed operator endpoints (HMAC-SHA256) for auth, game, and bet.",
      "A single API key for the data APIs: lobby, history, classification, and streaming.",
      "One tokenized launch URL you embed as an iframe.",
      "A VP / GameLink aggregator path if you reach us through an aggregator.",
    ],
  },
  {
    type: "split",
    kicker: "Wallet",
    title: "Your wallet, [[your way]].",
    foot: "One flag at onboarding. You can change your mind without re-integrating.",
    cols: [
      { tag: "Option A", h: "Seamless / One Wallet", p: "Keep a single balance. We call your wallet, or your aggregator calls ours, and each bet and settlement lands in one atomic, idempotent call." },
      { tag: "Option B", h: "Transfer wallet", p: "Prefer to pre-fund? Deposit into the game balance, let players play, and withdraw the rest. No per-bet wallet calls at all." },
    ],
  },
  {
    type: "feature",
    kicker: "Trust",
    title: "Money that never [[double-counts]].",
    lead: "The parts operators worry about are the parts we hardened first.",
    items: [
      "Bet and settlement run as one atomic, idempotent transaction. A retried call can never pay twice.",
      "Settlement answers inside a 2.5 second window, or it safely rolls back.",
      "Every movement is written to an immutable ledger you can audit.",
    ],
  },
  {
    type: "stats",
    kicker: "Live Video",
    title: "A stream your players [[believe]].",
    lead: "WHEP / WebRTC first, HLS second, and a cards-only visualizer if the feed ever drops, so the round keeps moving.",
    stats: [
      { num: "~1.3s", lbl: "Glass-to-glass latency over WebRTC" },
      { num: "251ms", lbl: "Median game-event sync to the video" },
      { num: "3-layer", lbl: "WebRTC, HLS, then cards-only fallback" },
    ],
  },
  {
    type: "feature",
    kicker: "Reporting",
    title: "Reconcile every [[peso]].",
    lead: "Enough reporting to close your books and settle any dispute without a phone call.",
    items: [
      "Daily GGR reports and bet logs, ready to pull on your schedule.",
      "Transaction-status lookup for any single bet.",
      "Signed, expiring per-round links for clean dispute resolution.",
      "A full request and response audit trail.",
    ],
  },
  {
    type: "stats",
    kicker: "Built For The Region",
    title: "Tuned for the [[Philippine market]].",
    stats: [
      { num: "PHP", lbl: "Settled in peso, two decimal places" },
      { num: "₱10 – ₱10k", lbl: "Default table limits, configurable per table" },
      { num: "10 – 30s", lbl: "Configurable betting windows per round" },
    ],
  },
  {
    type: "feature",
    kicker: "Security",
    title: "Production-grade, [[secure by default]].",
    lead: "Not a prototype in front of your players. A hardened service with the controls operators are audited on.",
    items: [
      "IP allowlisting on the operator and aggregator surfaces.",
      "Row-level database security and split, per-surface secrets.",
      "Redis-backed rate limiting and idempotency on every money call.",
      "Full request auditing, with separate production and staging environments.",
    ],
  },
  {
    type: "stats",
    kicker: "Where We Are",
    title: "Deployed, and integrating with a [[live aggregator]].",
    lead: "Playroom is deployed to production infrastructure and is integrating with a live aggregator through the VP / GameLink standard. Fill these with your current, real figures before presenting.",
    stats: [
      { num: "{{N}}", lbl: "Live tables running today" },
      { num: "{{99.xx%}}", lbl: "Measured uptime over {{period}}" },
      { num: "{{₱ / mo}}", lbl: "Handle processed per month" },
    ],
  },
  {
    type: "split",
    kicker: "Commercials",
    title: "Simple terms, [[aligned incentives]].",
    foot: "Replace with your commercial model before presenting.",
    cols: [
      { tag: "Revenue share", h: "{{XX%}} of GGR", p: "No hidden platform fees. We win when you win. {{Add minimum guarantee or tier detail here.}}" },
      { tag: "Onboarding", h: "{{No setup fee}}", p: "{{Describe setup, timeline, and what is included: dedicated support, custom limits, co-branding.}}" },
    ],
  },
  {
    type: "steps",
    kicker: "Getting Started",
    title: "Live in [[four steps]].",
    steps: [
      { h: "Exchange credentials", p: "We issue your keys and you pick a wallet mode. Half a day of paperwork." },
      { h: "Integrate the sandbox", p: "Build against our staging API and interactive Swagger docs." },
      { h: "Run test rounds", p: "Bet, settle, void, and reconcile end to end before a peso is real." },
      { h: "Embed and go live", p: "Drop the table into your site and open it to your players." },
    ],
  },
  {
    type: "close",
    kicker: "Let's Play",
    title: "Put a live table on [[your floor]].",
    contacts: [
      { k: "Contact", v: "{{Your name}}" },
      { k: "Email", v: "{{email}}" },
      { k: "WhatsApp / Viber", v: "{{number}}" },
      { k: "Docs", v: "{{api.playroomgaming.ph/docs}}" },
    ],
  },
];
