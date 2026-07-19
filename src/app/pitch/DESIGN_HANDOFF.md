# Design handoff — Playroom Gaming operator pitch deck

**For:** a design pass on an existing, working deck.
**Status:** functionally complete and content-reviewed. It needs *visual design*, not rebuilding.
**Route:** `/pitch` in the `playroom-web` repo (Next.js 16, TypeScript, Tailwind 4, Vercel).

---

## 1. What this is

A **B2B sales deck** that Playroom Gaming presents to **casino operators** to get them to
integrate the product. It is a real web page, not a PDF: full-screen slides you scroll
through, presented live on a laptop or sent as a gated link.

**The product is adult-first live casino: topless live baccarat.** That is the entire
commercial differentiator, so the deck leads with it. This drives a hard design tension you
must hold:

> Provocative product. Professional operation.

The buyer is a compliance-conscious gaming executive deciding whether this creates legal or
reputational risk for them. The design must read **premium, cinematic, adult, and
enterprise-credible**. It must not read as a porn site or a cheap casino.

**Explicitly avoid** (from the client's own brief): cheap casino aesthetics, excessive neon,
porn-site styling, visual clutter, and over-use of female imagery.

---

## 2. Where the code lives

All files are under `src/app/pitch/`:

| File | Role |
|---|---|
| `content.ts` | **All copy.** Single source of truth for words. Typed slide union. |
| `pitch.css` | **All styling.** ~700 lines, every rule scoped under `.pitch-root`. |
| `PitchDeck.tsx` | Renderer. A `switch` on slide `type` maps data to markup. Also owns keyboard nav, the progress rail, and the scroll container. |
| `Reveal.tsx` | Adds `.in` when a slide enters view, triggering the staggered entrance. |
| `Watermark.tsx` | Anti-distribution tiled watermark + corner tag. |
| `AdultGate.tsx` | The 18+ click-to-reveal overlay for adult media. |
| `layout.tsx` | Scoped fonts + `robots: noindex`. |
| `page.tsx` | Reads `?o=OperatorName` for the watermark. |

**Content and presentation are already separated.** Restyle in `pitch.css` and
`PitchDeck.tsx`. Do not rewrite copy in `content.ts` (see §8).

---

## 3. Current design system

### Colour

Derived from the actual brand logo, which samples to **`#E80818`** (vivid scarlet).
Tokens are defined on `.pitch-root` in `pitch.css`:

```
--ink:        #050405   /* page black            */
--ink-2:      #0c0a0b
--panel:      #17100f   /* warm near-black panel */
--panel-line: rgba(232,30,40,0.18)

--red:        #ec1f28   /* primary accent        */
--red-bright: #ff3b43   /* emphasis, big numbers */
--red-deep:   #7c0c12   /* glows, depth          */

--gold:       #e2b24a   /* SECONDARY, sparing    */

--fg:         #f6f2f1   /* primary text          */
--muted:      #b0a6a3   /* body copy             */
--dim:        #766c69   /* meta, footnotes       */
```

Bet-colour accents, inherited from the live product so the deck matches the real UI:
`--banker #fb2c36`, `--player #2b7fff`, `--tie #00bc7d`.

**Gold is deliberately reserved** for `{{placeholder}}` chips (the "fill this in before
presenting" markers) so they stay visually distinct from real red-accented content. If you
introduce gold elsewhere, keep placeholders unmistakably different.

### Typography

- **Display:** Fraunces (serif), weights 400-700, italic used for emphasis.
- **Mono:** IBM Plex Mono, for kickers, meta, footnotes, tags.
- **Body:** Inter (inherited from the product's global theme).

⚠️ **Open decision:** the client's original brief asked for a *"bold condensed display font"*
for headlines. The build currently uses **Fraunces**, an elegant high-contrast serif, which
reads more premium/editorial and less sports-betting. Either direction is defensible.
**Please make a deliberate call and justify it.**

### Motion

The client specifically asked for: *"full screen slides, but when scrolling down the page is
animated so it shows the next content in a left-to-right manner, similar to how mobile app
websites showcase it."*

Currently implemented as: each slide's children carry `.reveal-item` and enter with
`translate3d(-46px,0,0) → none` plus opacity, on a `cubic-bezier(0.16,1,0.3,1)` curve,
staggered `85ms` per item via a `--i` custom property.

This is a competent baseline but it is **the same entrance on every slide**. Motion design is
one of the biggest available wins (see §7).

### Layout

- Full-viewport slides, `scroll-snap-type: y mandatory`, `scroll-snap-stop: always`.
- Content capped at `1180px`, vertically centred.
- Fluid type via `clamp()` throughout.
- Fixed UI: slide counter (top-left), `18+` badge (top-right), progress rail (right edge),
  watermark tag (bottom-left).

---

## 4. Slide inventory (17 slides)

Order is deliberate: **opportunity → problem → product → proof → differentiation →
technical → commercial → close.** Proof (screenshots, demo, traction) is clustered early on
purpose, because a skeptical operator decides "real product or vaporware?" fast.

| # | `type` | Purpose | Notes for design |
|---|---|---|---|
| 1 | `cover` | Logo, positioning, who it's prepared for | Client wants a cinematic logo reveal. Currently static. |
| 2 | `market` | €30B+ category, 4 big-number cards | Needs to feel like data, with a source footnote |
| 3 | `statement` | The operator problem: no differentiation | Pure typography slide |
| 4 | `feature` | The product: topless baccarat as premium | 4-item list + lead |
| 5 | `showcase` | **Real product screenshots** | 18+ gated. Assets pending. |
| 6 | `demo` | **Gameplay video** | 18+ gated, no autoplay. Asset pending. |
| 7 | `stats` | Traction: deployed + integrating | 3 big figures, mostly placeholders |
| 8 | `pillars` | Why it wins attention (product) | 3 cards |
| 9 | `odds` | Bet menu, 13 payouts | **Visually flattest slide in the deck** |
| 10 | `feature` | Integration: EvoLive standard | **Begs for a diagram** |
| 11 | `split` | Wallet + settlement integrity | 2 columns |
| 12 | `stats` | Live video: latency, fallbacks | 3 figures |
| 13 | `pillars` | Commercial value to the operator | 3 cards |
| 14 | `phases` | 4-phase roadmap | **Begs to be a timeline** |
| 15 | `feature` | Trust & compliance | The risk-defusing slide |
| 16 | `split` | Commercials | 2 columns, heavy placeholders |
| 17 | `close` | CTA + contacts | Should land hard |

There is also an unused `steps` type still in the union.

### Copy token system

`content.ts` uses two inline markers that `PitchDeck.tsx` parses:

- `{{double braces}}` → renders a gold dashed **placeholder chip**. These mark figures only
  the client can supply (commercials, uptime, certifications, contacts). They are *meant* to
  be visually loud so nothing ships un-filled.
- `[[double brackets]]` → renders **italic red emphasis** inside a headline.

Preserve both behaviours.

---

## 5. Adult-content handling (non-negotiable)

Slides 5 and 6 show the real product, which contains nudity.

- Both sit behind `AdultGate.tsx`: an overlay reading **"18+ / Adults only / tap to reveal"**.
- The gate is **95.5% opaque with a 30px backdrop blur**. It must **fully obscure** the media
  before the click. If you restyle it, do not reduce that opacity: the deck gets opened in
  offices and coffee shops and emailed as a link.
- The demo video has `preload="none"`, **no autoplay**, and only gains `controls` after reveal.
- A persistent `18+` badge sits top-right on every slide.
- The cover carries the legal line: *"18+ / 21+ where required · For licensed operators and
  approved jurisdictions only."*

**Asset framing:** screenshots should be cropped **UI-forward** to showcase the product
(bet menu, roadmaps, live chat, video frame) rather than centring the dealer. This is both
tasteful and better salesmanship: the operator is buying the platform.

Assets drop into `public/pitch/` (`screen-1.jpg`, `screen-2.jpg`, `demo.mp4`,
`demo-poster.jpg`). Until they exist, slides show a styled "add your screenshot" placeholder
with the exact path. **That fallback must keep working** so the deck never looks broken.

---

## 6. Security and distribution constraints

- **noindex/nofollow/nocache** via `layout.tsx` metadata.
- **Watermark:** a faint tiled `Playroom · {Operator}` overlay at 5% opacity, plus a corner
  tag with operator name and view timestamp. This is anti-distribution: a leaked screenshot
  should identify its source. You may restyle it, but it must stay **legible enough to deter
  and survive a screenshot**, while not wrecking readability.
- Right-click is disabled, `Ctrl/Cmd+P` and `+S` are intercepted, text selection is off, and
  `@media print` hides the deck entirely. These are deterrents, not real DRM.
- **A per-operator, time-limited password gate is coming.** Each operator will get their own
  expiring credentials so the deck cannot circulate unsupervised. **Please design the login
  screen** as part of this pass: it is the first thing an operator sees, so it sets the tone.
  It needs a code entry, the Playroom brand, an 18+ notice, and clear expired/invalid states.

---

## 7. What actually needs design (prioritised)

The deck currently looks like *well-executed typographic defaults*. It is clean but it is
mostly words on black. The brief asks for **premium and cinematic**. Highest-leverage work:

1. **Give slide types distinct visual identities.** Right now nearly every slide is
   kicker → headline → content, left-aligned, in one column. Vary composition, scale, and
   asymmetry so the deck has rhythm across 17 slides.
2. **Cover / opening moment.** The client explicitly wants a logo reveal: *"Live Casino"*
   appears, then *"Reimagined for Adult Audiences"*, with the product UI fading in behind.
   This is the single highest-impact slide.
3. **Add visual language beyond type.** There are currently no diagrams, icons, or graphics.
   Specifically:
   - Slide 10 (integration): an architecture strip, `Operator → Playroom API → Wallet →
     Live Studio → Reporting`.
   - Slide 14 (roadmap): a real timeline instead of four equal cards.
   - Slide 9 (odds): 13 payout cells currently read as a spreadsheet. Make the deep bet menu
     feel like a *commercial* asset.
4. **Motion differentiation.** One shared entrance for every slide is a missed opportunity.
   Consider per-type motion, parallax on the atmosphere layer, and number count-ups on the
   `market`/`stats` slides. Respect `prefers-reduced-motion` (already wired).
5. **The 18+ gate as a designed moment.** It is currently functional. It is also the most
   dramatic beat in the deck, the reveal of the actual product. Make it feel intentional.
6. **Mobile.** Breakpoints exist at 960/860/560px and the layout holds, but it has not been
   designed for mobile, only made not to break. Operators do open links on phones.
7. **The close.** "The table is familiar. The experience is not." should land like a closing
   argument, not a contact list.

---

## 8. Do not change

- **Copy in `content.ts`.** It has been through a narrative review and carries deliberate
  compliance wording ("adult-first", "premium adult entertainment", "topless live baccarat"),
  sourced market figures with footnotes, and legal framing. Flag copy problems, do not
  silently rewrite. Technical claims are drawn from the actual backend.
- **The `{{placeholder}}` and `[[emphasis]]` token behaviour.**
- **Scoping.** Every rule must stay under `.pitch-root`. This repo also serves the live
  studio, player, and admin UIs. Deck styles leaking into the product would be a real
  incident.
- **The 18+ gate's obscuring behaviour** (§5) and the noindex/watermark posture (§6).
- **Asset fallbacks**, so a missing screenshot never renders as a broken image.
- Keep the deck **self-contained**: no external CDNs, fonts loaded via `next/font`.

---

## 9. Running it

```bash
npm run dev
# then open:
http://localhost:3000/pitch?o=Demo%20Operator
```

The `?o=` param sets the watermark name (it moves to the verified session once the gate
lands). Arrow keys, PageUp/Down, Space, Home/End all navigate. The right-edge rail jumps.

---

## 10. Open questions for the designer

1. **Fraunces serif vs. the briefed "bold condensed" display face.** Pick one deliberately.
2. How far should gold go as a secondary accent before it competes with the placeholder
   system?
3. Should the deck offer a **light/print-friendly variant** for operators who ask for a PDF,
   given print is currently blocked for security?
4. Does the **external sales variant vs. private demo variant** distinction (different
   screenshot crops per audience) need a design-level switch, or stays an asset swap?
