/**
 * Operator pitch deck content — Playroom Gaming (adult-first live baccarat).
 *
 * This is the ONLY file you should need to edit to change the words.
 *   {{double braces}} -> renders a gold "fill me in" chip (operator-supplied
 *     figures: commercials, live metrics, contacts). Search for "{{".
 *   [[double brackets]] -> italic red emphasis inside a headline.
 *
 * Positioning follows the agreed wording rules: "adult-first", "premium adult
 * entertainment", "topless live baccarat". Every TECHNICAL claim is grounded in
 * the backend repo. Market figures come from the sources cited on that slide;
 * verify before an external send. Do not add hard metrics (uptime, tables,
 * volume) as plain text — keep them as {{placeholders}} until measured.
 *
 * Product visuals live in /public/pitch/ (see that folder's README). The
 * showcase + demo slides gate them behind an 18+ click-to-reveal.
 */

export type Slide =
  | { type: "cover"; kicker: string; title: string; sub: string; foot: { k: string; v: string }[]; note: string }
  | { type: "market"; kicker: string; title: string; cards: { big: string; cap: string }[]; insight: string; source: string }
  | { type: "statement"; kicker: string; title: string; body: string }
  | { type: "pillars"; kicker: string; title: string; cards: { idx: string; h: string; p: string }[] }
  | { type: "feature"; kicker: string; title: string; lead?: string; items: string[] }
  | { type: "showcase"; kicker: string; title: string; note: string; shots: { src: string; cap: string }[] }
  | { type: "demo"; kicker: string; title: string; note: string; video: string; poster: string }
  | { type: "odds"; kicker: string; title: string; note: string; odds: { name: string; pay: string; accent?: "banker" | "player" | "tie" }[] }
  | { type: "split"; kicker: string; title: string; foot?: string; cols: { tag: string; h: string; p: string }[] }
  | { type: "stats"; kicker: string; title: string; lead?: string; stats: { num: string; lbl: string }[] }
  | { type: "phases"; kicker: string; title: string; items: { tag: string; h: string; points: string[] }[] }
  | { type: "steps"; kicker: string; title: string; steps: { h: string; p: string }[] }
  | { type: "close"; kicker: string; title: string; contacts: { k: string; v: string }[] };

export const DECK: Slide[] = [
  {
    type: "cover",
    kicker: "Adult-First Live Casino · B2B Game Provider",
    title: "Live casino, [[reimagined]] for adult audiences.",
    sub: "Premium topless live baccarat, built on real game-provider infrastructure, ready to drop into your platform.",
    foot: [
      { k: "Prepared for", v: "{{Operator name}}" },
      { k: "Presented by", v: "{{Your name}}" },
      { k: "Date", v: "{{Month YYYY}}" },
    ],
    note: "18+ / 21+ where required · For licensed operators and approved jurisdictions only",
  },
  {
    type: "market",
    kicker: "The Opportunity",
    title: "Live casino is already a [[€30B+]] global category.",
    cards: [
      { big: "€105.2B", cap: "Global online casino gross gaming revenue, 2025." },
      { big: "29%", cap: "Live casino's share of the online casino market." },
      { big: "~€30.5B", cap: "Implied global live casino market, 2025 (29% x €105.2B)." },
      { big: "14.3%", cap: "Live casino's five-year compound annual growth rate." },
    ],
    insight: "Asia is roughly <b>€46.4B, about 44%</b> of the global online casino market, and it is exactly where a differentiated live product travels fastest.",
    source: "Source: Evolution Annual Report 2025 (H2 Gambling Capital estimates, 26 Feb 2026), pp. 10, 12-13, 24-25. €30.5B is an implied figure (share x total), not a directly reported one. Verify before external use.",
  },
  {
    type: "statement",
    kicker: "The Operator Problem",
    title: "Live casino has scale. It lacks [[meaningful differentiation]].",
    body: "Most live products compete on the same axes: more tables, more languages, more variants, more studio capacity. To the player, one baccarat table looks like the next. Operators are fighting for the same attention in a crowded lobby, with content that is hard to make a marketing story out of. Playroom does not reinvent baccarat. It reinvents how baccarat is presented, discovered, and remembered.",
  },
  {
    type: "feature",
    kicker: "The Product",
    title: "Topless baccarat, engineered as a [[premium live product]].",
    lead: "Familiar gameplay. Distinctive entertainment. Frictionless execution.",
    items: [
      "Professionally hosted, adult-only live baccarat in a controlled broadcast studio.",
      "The exact mechanics players know: Player, Banker, Tie, pairs, and premium side bets.",
      "Real-time video, betting, results, roadmaps, and live chat in one clean, mobile-first UI.",
      "Operator-ready integration with configurable branding, currencies, languages, and limits.",
    ],
  },
  {
    type: "showcase",
    kicker: "The Live Product",
    title: "This is the real table, [[live today]].",
    note: "Actual product UI. Adult content is gated behind an 18+ reveal. Drop your approved crops into /public/pitch/ (see README).",
    shots: [
      { src: "/pitch/screen-1.jpg", cap: "Live table — video, bet menu, roads, chat" },
      { src: "/pitch/screen-2.jpg", cap: "Mobile-first player view" },
    ],
  },
  {
    type: "demo",
    kicker: "See It In Play",
    title: "A round of topless baccarat, [[end to end]].",
    note: "Short gameplay clip. Gated behind an 18+ reveal, no autoplay. Add demo.mp4 + demo-poster.jpg to /public/pitch/ (see README).",
    video: "/pitch/demo.mp4",
    poster: "/pitch/demo-poster.jpg",
  },
  {
    type: "pillars",
    kicker: "Why Playroom Wins Attention",
    title: "Built to be seen, remembered, and [[reopened]].",
    cards: [
      { idx: "01", h: "Immediate differentiation", p: "A visually distinct live table that does not disappear among dozens of near-identical baccarat games in the lobby." },
      { idx: "02", h: "Familiar conversion path", p: "Players already know baccarat. The entertainment layer creates novelty without asking them to learn a new game." },
      { idx: "03", h: "Modern, mobile-first performance", p: "Clean betting states, readable roadmaps, fast loading, and stable streaming on mobile networks." },
    ],
  },
  {
    type: "odds",
    kicker: "The Bet Menu",
    title: "A full baccarat table, [[side bets included]].",
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
    lead: "The parts operators are audited on are the parts we hardened first.",
    items: [
      "Bet and settlement run as one atomic, idempotent transaction. A retried call can never pay twice.",
      "Settlement answers inside a 2.5 second window, or it safely rolls back.",
      "Every movement is written to an immutable ledger, with full request and response audit trails.",
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
    type: "pillars",
    kicker: "Value For Operators",
    title: "A product designed to create [[commercial leverage]].",
    cards: [
      { idx: "Acquire", h: "A campaign hook, not another tile", p: "A high-visibility lobby feature and differentiated creatives for affiliate, VIP, and launch-event marketing." },
      { idx: "Engage", h: "Attention that comes back", p: "Human presence, live chat, themed tables and events, and mobile-first play built to reduce friction and deepen sessions." },
      { idx: "Monetize", h: "Aligned upside", p: "More reasons to enter the live lobby, room for VIP and premium tables, and revenue share aligned between us and you." },
    ],
  },
  {
    type: "phases",
    kicker: "Roadmap",
    title: "Start with baccarat. Build an [[adult live category]].",
    items: [
      { tag: "Phase 1", h: "Flagship", points: ["Topless live baccarat", "Mobile + desktop", "Core side bets", "Live chat + roadmaps", "Shared tables"] },
      { tag: "Phase 2", h: "Localize + VIP", points: ["Local-language dealers", "Market-specific limits", "VIP + high-limit rooms", "Dedicated operator tables", "Branded studios"] },
      { tag: "Phase 3", h: "Portfolio", points: ["Adult live blackjack", "Adult live roulette", "Speed + squeeze baccarat", "Themed dealer lineups", "Scheduled events"] },
      { tag: "Phase 4", h: "Proprietary", points: ["Adult live game shows", "Hosted tables where permitted", "Loyalty + jackpot formats", "Data-driven table personalization"] },
    ],
  },
  {
    type: "feature",
    kicker: "Trust & Compliance",
    title: "Provocative product. [[Professional operation]].",
    lead: "Adult entertainment demands a higher standard of control. We treat compliance as a product feature, not a footer.",
    items: [
      "Age-gated access (18+ / 21+ by jurisdiction) and distribution only through licensed or approved operators.",
      "Operator KYC, AML, self-exclusion, and responsible-gaming integrations, with jurisdiction-level content controls.",
      "Full game, bet, and settlement audit trails, plus studio security and game-integrity procedures.",
      "Performer consent, welfare, contracts, and privacy safeguards; no marketing to minors.",
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
    foot: "Present only the models you actually offer. Replace before sending.",
    cols: [
      { tag: "Revenue share", h: "{{XX%}} of GGR", p: "No hidden platform fees. We win when you win. {{Add minimum guarantee, tiers, or hybrid structure here.}}" },
      { tag: "Onboarding", h: "{{Setup terms}}", p: "{{Describe setup, timeline, and what is included: dedicated tables, branded studio, support SLA.}}" },
    ],
  },
  {
    type: "close",
    kicker: "Launch Playroom Gaming",
    title: "The table is familiar. The [[experience is not]].",
    contacts: [
      { k: "Contact", v: "{{Your name}}" },
      { k: "Email", v: "{{email}}" },
      { k: "Telegram / WhatsApp", v: "{{number}}" },
      { k: "Docs", v: "{{api.playroomgaming.ph/docs}}" },
    ],
  },
];
