# Mobile-responsive `/admin` and `/admin-ocms`

Date: 2026-07-30
Status: approved, implementing
Repo: `playroom-web`

## Goal

Make both backoffice panels usable one-handed on a phone (390px) without
changing the desktop experience, the dark/gold visual language, the IA, or any
route.

This is a **redesign-preserve** job. Theme tokens, nav labels, route slugs,
form field names and analytics-relevant IDs stay exactly as they are.

## Why now

Both panels share one shell and it has no mobile story. Across ~35 admin files
there are 15 responsive prefixes total, and every one of them is on a stat-card
grid that already worked. Concretely:

1. **The sidebar is unconditional.** `flex h-screen overflow-hidden` wrapping a
   hard-coded 220px `<aside>`. On a 390px viewport that is 56% of the screen.
   The existing collapse toggle only reaches 64px (16%), and at that width the
   labels are gone.
2. **The header overflows.** 56px tall, `justify-between`, no wrap, carrying
   breadcrumbs + avatar + display name + role + Manual + Password + Logout. The
   right-hand controls are pushed off-screen on a phone.
3. **Tables.** `DataTable` wraps in `overflow-x-auto`, so its 6-9 column tables
   side-scroll. The OCMS players and reports lists are not `DataTable` at all —
   they are hand-rolled `grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.9fr]`, which
   squashes rather than scrolls.
4. **Filter bars carry pinned widths** (`min-w-[220px]`, two `w-[100px]` date
   inputs) that blow out the row on a phone.
5. **Pinch-zoom is disabled globally.** The root layout sets
   `maximumScale: 1, userScalable: false`. That is right for the player game
   canvas and wrong for an admin panel: it fails WCAG 1.4.4 and removes the only
   escape hatch on a dense screen.
6. **Header buttons are ~26px tall**, under the 44px touch-target minimum.

## Approach

Fix the shared shell once, then sweep the pages. Both panels share the sidebar,
header, `DataTable` and dialog primitives, so most of the win lands in ~8 files.

### Breakpoints

Standard Tailwind scale. Two thresholds matter:

- `< lg` (1024px): sidebar becomes an off-canvas drawer.
- `< md` (768px): tables become card rows, filter bars stack, header condenses.

### 1. Shell — off-canvas nav

`AdminProvider` and `OcmsProvider` each gain `mobileNavOpen` / `setMobileNavOpen`.

Below `lg` the `<aside>` renders as a fixed-position drawer sliding in from the
left over a `bg-black/60` backdrop. Above `lg` it is exactly what it is today,
including the existing collapse toggle, which stays desktop-only.

The drawer closes on: backdrop click, Escape, and route change. It traps focus
while open and restores focus to the hamburger on close. Body scroll is locked
while open.

The panel layouts switch from `h-screen` to `min-h-[100dvh]` so iOS Safari's
address bar does not clip the bottom of the content.

### 2. Header

Below `md`:
- A hamburger button (44x44) appears at the left, toggling the drawer.
- Breadcrumbs collapse to the final segment only.
- Manual / Password / Logout fold into a single overflow menu behind a
  44x44 button. The avatar stays; the display name and role move into the menu.

Above `md` the header is unchanged.

### 3. `DataTable` — card mode below `md`

`Column<T>` gains two optional fields:

```ts
/** How this column appears in mobile card mode. Default: "row". */
mobile?: "title" | "row" | "hide";
/** Shorter label to use in card mode when the table header is verbose. */
mobileLabel?: string;
```

Below `md` each row renders as a card:
- the `mobile: "title"` column (falling back to the first column) becomes the
  card heading,
- every `mobile: "row"` column becomes a label/value pair,
- `mobile: "hide"` columns are omitted,
- when `onRowClick` is set the card is a real `<button>` with an accessible
  name and a trailing chevron, so it is keyboard-reachable, not a click handler
  on a `<tr>`.

The `<table>` markup is untouched above `md`. Loading, empty and pagination
states get card-mode equivalents.

`SortHeader` / `SortHeaderLink` are desktop-only affordances; in card mode the
sort control surfaces as a labelled `<select>` above the list so server-side
sorting stays reachable.

### 4. Hand-rolled tables

The OCMS players and reports grids and the inline `<table>`s on the detail
pages (`players/[id]`, `rounds/[id]`, `operators/[id]`, `tables/[id]`,
`reports`, `test-tokens`, `pitch-links`, `monitoring`, `audit`) get the same
card treatment below `md`. Where a page already renders a bespoke row layout it
adopts the shared card pattern rather than growing a second one.

### 5. Filter bars and forms

`flex-wrap` on every filter row; inputs go full width below `md` and drop their
pinned `min-w-[220px]` / `w-[100px]`. Labels stay above inputs. Every
interactive control reaches 44px of touch height on mobile.

Dialogs (`FormDialog`, `ConfirmDialog`, `AdminManualDialog`, the header
password dialog) get `max-h-[90dvh]`, internal scroll, and full-width stacked
action buttons below `md`.

### 6. Pinch-zoom on admin routes only

Add `src/app/admin/layout.tsx` (a pass-through server component) exporting a
`viewport` that re-enables zoom, and add the same export to the existing
`src/app/admin-ocms/layout.tsx`. The root layout is left alone so the player
game keeps its locked viewport.

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};
```

`src/app/admin/layout.tsx` must not carry `preferredRegion`; only the OCMS
segment is pinned to `sin1`, and that stays as-is.

### 7. Login and force-password

Both panels' login and force-password screens get mobile padding and full-width
controls. They are already narrow single-column forms, so this is small.

## Out of scope

- No new design system, no component library, no visual redesign.
- No IA changes: nav labels, route slugs and anchor IDs are frozen.
- No changes to data fetching, pagination semantics or server-side sorting.
- The studio (`/studio`) and player UIs are untouched.

## Testing

- `npx tsc --noEmit` clean. (`npm run lint` is dead since Next 16 — do not use it.)
- Existing admin e2e (`e2e/admin.spec.ts`) still passes at desktop width.
- Manual browser pass at 390px, 768px and 1440px across: both dashboards,
  Players list + detail, Rounds, Reports, Audit, Monitoring, Settings, and the
  OCMS Players list + detail.
- Verify the drawer closes on route change and that no page scrolls
  horizontally at 390px.

## Risks

- **Card mode hiding a column an operator relies on.** Mitigated by defaulting
  to `"row"`: a column is only dropped from the card when a call site opts it
  out explicitly.
- **Regressing desktop.** Every change is additive behind a breakpoint; the
  desktop branch keeps the current markup.
- **Focus trap bugs in the drawer.** Covered by a keyboard pass during
  verification.
