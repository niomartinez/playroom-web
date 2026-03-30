# Baccarat Dealer UI - Studio Design Specification

> Extracted from Figma design context (file nodes 15:3020 and descendants).
> **Note:** The Figma export was a **sparse metadata response** (positional data only). Colors, fonts, gradients, and asset URLs were NOT included in the export. The sections below marked with `[NEEDS FIGMA DETAIL]` require a follow-up `get_design_context` call on the specific sub-layer IDs listed, or visual inspection of the Figma screenshot.

---

## 1. Overall Canvas

| Property | Value |
|----------|-------|
| Frame name | `Baccarat Dealer UI` |
| Figma ID | `15:3020` |
| Dimensions | **1534 x 925 px** |
| Origin | x=-16, y=80 (canvas offset) |

The root `App` frame (`15:3021`) is 1534 x 925 and contains three vertical strips:

```
+------------------------------------------------------------------+
|  HEADER  (1534 x 62)                                             |
+------------------------------------------------------------------+
|  MAIN CONTENT AREA  (1534 x 818)                                 |
|  +---------+---------------------------+-----------+              |
|  | BEAD    | ROADS (Big Road +         | RIGHT     |              |
|  | ROAD    | Big Eye + Small Road +    | PANEL     |              |
|  | 128x502 | Cockroach Pig) 990x751    | 320x751   |              |
|  +---------+---------------------------+-----------+              |
+------------------------------------------------------------------+
|  FOOTER  (1534 x 45)                                             |
+------------------------------------------------------------------+
```

---

## 2. Component Hierarchy

```
Baccarat Dealer UI (1534x925) [15:3020]
  App (1534x925) [15:3021]
  |
  +-- Header (1534x62) [15:3022]  (self-closing - no child detail in sparse export)
  |
  +-- Container / Main Content (1534x818) [15:3032] @ y=62
  |   |
  |   +-- Bead Road Panel (128x502) [15:3033] @ (24, 24)
  |   |   +-- Title: "BEAD ROAD" (102x16) [15:3035]
  |   |   +-- Bead Grid (106x438) [24:7491]
  |   |       +-- 100 cells, each 20x20, inner circle 16x16
  |   |       +-- Grid: ~5 columns x 20 rows
  |   |       +-- Cell spacing: ~21.67px horizontal, 22px vertical
  |   |
  |   +-- Roads Panel (990x751) [15:3337] @ (176, 24)
  |   |   |
  |   |   +-- Big Road (990x458) [15:3338] @ (0, 0)
  |   |   |   +-- Header row: "BIG ROAD" left, "Game #18" right
  |   |   |   +-- Grid area (951x394) [23:29002] @ (17, 49)
  |   |   |       +-- ~791 cells, each 20x20, inner 16x16
  |   |   |       +-- Grid: ~44 columns x 18 rows
  |   |   |       +-- Cell spacing: ~21.67px H, 22px V
  |   |   |
  |   |   +-- Big Eye Row (990x132) [15:3730] @ (0, 474)
  |   |   |   +-- Title: "BIG EYE" (964x16) [15:3732]
  |   |   |   +-- Grid frame (454x88 left + 497x88 right) [24:7366]
  |   |   |   +-- 45 vertical lines x 5 horizontal lines
  |   |   |   +-- Cell size: ~21px W x 22px H
  |   |   |   +-- Contains Group 14, Group 15 data markers (~18x19)
  |   |   |
  |   |   +-- Bottom Row (990x132) [15:3729] @ (0, 622)
  |   |       +-- Small Road (495x132) [15:3926] @ (0, 0)
  |   |       |   +-- Title: "SMALL ROAD" (457x16) [15:3928]
  |   |       |   +-- Grid: Frame 1 (454x88) @ (13, 37)
  |   |       |   +-- 15 Group markers (~18x19 each)
  |   |       |
  |   |       +-- Cockroach Pig (482x132) [15:4122] @ (506, 0)
  |   |           +-- Title: "COCKROACH PIG" (456x16) [15:4124]
  |   |           +-- Grid: Frame 1 (454x88) @ (13, 37)
  |   |           +-- 5 Group markers (~17x18 each)
  |   |
  |   +-- Right Panel (320x751) [15:4318] @ (1190, 24)
  |       |
  |       +-- Score Panel (320x485) [15:4319] @ (0, 0)
  |       |   +-- Score rows container (278x428) [15:4322] @ (21, 12)
  |       |   +-- 9 score rows, each 278x48, spaced 50px apart (2px gap)
  |       |   +-- Divider line (278x1) at y=450
  |       |
  |       +-- Next Game Panel (320x251) [15:4371] @ (0, 501)
  |           +-- Title: "NEXT GAME" (89x20) centered
  |           +-- Card area (278x256) [15:4374] @ (21, 57)
  |               +-- Banker column (131x120) @ left
  |               +-- Player column (131x120) @ right (x=147)
  |
  +-- Footer (1534x45) [15:4401] @ (0, 880)
  |   +-- Left info: LIVE indicator + Table + Dealer
  |   +-- Right info: Last Updated timestamp
  |
  +-- Header Overlay Elements (siblings of App, positioned absolutely)
      +-- Logo Image "Playroom Gaming" (150x80) [15:4431] @ (24, -9)
      +-- 4 Betting Zone labels (MIN/MAX displays)
      +-- Settings Button (24x24) [15:4450] @ (1477, 19)
```

---

## 3. Layout Structure

### 3.1 Header Bar
| Property | Value |
|----------|-------|
| Figma ID | `15:3022` |
| Dimensions | 1534 x 62 px |
| Position | Top of App, y=0 |

**Overlay elements positioned on top of the header (at the App-sibling level):**

| Element | Figma ID | Position | Size |
|---------|----------|----------|------|
| Logo (Playroom Gaming) | `15:4431` | (24, -9) | 150 x 80 |
| Bet Zone 1 (Main) | `15:4437` | (300, 8) | 193 x 20 |
| Bet Zone 2 (Pair/Tie) | `15:4441` + `15:4463` | (578, 8) + (579, 33) | 193 x 20 + 183 x 20 |
| Bet Zone 3 (Lucky 6) | `15:4444` + `15:4460` | (856, 8) + (865, 33) | 193 x 20 + 176 x 20 |
| Bet Zone 4 (Dragon 7/Panda) | `15:4447` + `15:4466` | (1134, 8) + (1159, 33) | 193 x 20 + 143 x 20 |
| Settings Button | `15:4450` | (1477, 19) | 24 x 24 |

Each betting zone shows:
- **Top row**: `MIN:$20` (left) and `MAX:$50,000` (right), separated by ~34px gap
- **Bottom row** (zones 2-4 only): Category label (`Pair / Tie`, `Lucky 6`, `Dragon 7 / Panda`)

Zone spacing: ~278px center-to-center.

### 3.2 Main Content Area
| Property | Value |
|----------|-------|
| Figma ID | `15:3032` |
| Dimensions | 1534 x 818 px |
| Position | y=62 (below header) |
| Padding | 24px all sides (inferred from child positions) |

**Three-column layout:**

| Column | Width | Height | X offset | Content |
|--------|-------|--------|----------|---------|
| Left (Bead Road) | 128 | 502 | 24 | Bead Road grid |
| Center (Roads) | 990 | 751 | 176 | Big Road + derived roads |
| Right (Scores) | 320 | 751 | 1190 | Score panel + Next Game |

Gap between columns: **24px** (176 - 128 - 24 = 24; 1190 - 176 - 990 = 24).

### 3.3 Footer Bar
| Property | Value |
|----------|-------|
| Figma ID | `15:4401` |
| Dimensions | 1534 x 45 px |
| Position | y=880 |
| Padding | 24px horizontal, 13px vertical |

**Footer content (single row, 1486px wide):**

| Element | Position | Text |
|---------|----------|------|
| LIVE indicator | x=0 | Green dot (8x8) + "LIVE" text |
| Table ID | x=69.75 | "Table: PRG-01" |
| Dealer name | x=188 | "Dealer: Sarah M." |
| Timestamp (right-aligned) | x=1333 | "Last Updated: 12:45:32" |

LIVE indicator: 8x8 circle at y-offset 6 (vertically centered), followed by 8px gap, then "LIVE" text.

---

## 4. Road Grid Specifications

### 4.1 Bead Road
| Property | Value |
|----------|-------|
| Container | 128 x 502 px |
| Title padding | 13px top, 13px left |
| Grid area | 106 x 438 px, offset (13, 41) |
| Columns | 5 (approximate, ~21.67px spacing) |
| Rows | 20 (22px spacing) |
| Cell size | 20 x 20 px (outer) |
| Inner circle | 16 x 16 px, offset (2, 2) inside cell |
| Total cells shown | ~100 |

### 4.2 Big Road
| Property | Value |
|----------|-------|
| Container | 990 x 458 px |
| Title row | 17px padding, "BIG ROAD" (left) + "Game #18" (right) |
| Grid area | 951 x 394 px, offset (17, 49) |
| Columns | ~44 (21.67px spacing) |
| Rows | 18 (22px spacing) |
| Cell size | 20 x 20 px (outer) |
| Inner circle | 16 x 16 px, offset (2, 2) |
| Total cells shown | ~791 |

### 4.3 Big Eye Road
| Property | Value |
|----------|-------|
| Container | 990 x 132 px, at y=474 inside Roads panel |
| Title | "BIG EYE" (spans 964px width) |
| Grid frame | Full width, starts at offset (13, 37) |
| Left grid | 454 x 88 px |
| Right grid continues | from x=475 to x=951 |
| Vertical lines | 45 total, ~21px spacing |
| Horizontal lines | 5 (at y=0, 22, 44, 66, 88) |
| Cell size | ~21 x 22 px |
| Data markers | Group elements ~18 x 19 px |

### 4.4 Small Road
| Property | Value |
|----------|-------|
| Container | 495 x 132 px, left half of bottom row |
| Title | "SMALL ROAD" |
| Grid | 454 x 88 px at offset (13, 37) |
| Same grid structure as Big Eye (left half) |
| Data markers | 15 Group elements (~18 x 19 px) |

### 4.5 Cockroach Pig
| Property | Value |
|----------|-------|
| Container | 482 x 132 px, right half of bottom row (x=506) |
| Title | "COCKROACH PIG" |
| Grid | 454 x 88 px at offset (13, 37) |
| Same grid structure as Big Eye (left half) |
| Data markers | 5 Group elements (~17 x 18 px) |

**Grid line pattern for Big Eye / Small Road / Cockroach Pig:**
- Vertical lines at: 0, 21, 43, 65, 86, 108, 130, 151, 173, 195, 216, 238, 259, 280, 302, 324, 345, 367, 389, 410, 432, 454 px
- Horizontal lines at: 0, 22, 44, 66, 88 px
- This creates a grid of ~22 columns x 4 rows (5 lines = 4 cells)

---

## 5. Score Panel (Right Panel - Top)

| Property | Value |
|----------|-------|
| Figma ID | `15:4319` |
| Dimensions | 320 x 485 px |
| Inner container | 278 x 428 px, offset (21, 12) |

### Score Rows

Each row is **278 x 48 px**, spaced **50px apart** (2px gap between rows).

| Row | Label | Figma Score | Y offset | Has Color Dot | Has Small Dot |
|-----|-------|-------------|----------|---------------|---------------|
| 1 | BANKER | 8 | 0 | Yes (16x16) | No |
| 2 | PLAYER | 9 | 50 | Yes (16x16) | No |
| 3 | TIE | 1 | 100 | Yes (16x16) | No |
| 4 | BANKER PAIR | 8 | 150 | Yes (16x16) | Yes (6x6) |
| 5 | BANKER PAIR* | 9 | 200 | Yes (16x16) | Yes (6x6) |
| 6 | LUCKY 6 | 1 | 250 | Yes (16x16) | No |
| 7 | DRAGON 7 | 9 | 300 | Yes (16x16) | No |
| 8 | PANDA 8 | 1 | 350 | Yes (16x16) | No |
| 9 | GAME NUMBER | 1 | 400 | No | No |

> *Row 5 likely represents "PLAYER PAIR" - the Figma text says "BANKER PAIR" but this is probably a data placeholder issue since there are two rows with that label.

**Row layout:**
```
[8px padding] [16x16 color dot] [8px gap] [6x6 small dot?] [label text] ... [score number right-aligned]
```
- Label: left-aligned with dot, height 20px, y-centered in row
- Score number: right-aligned, height 32px, slightly offset (y=-1)
- Divider line: 278 x 1 px at y=450

---

## 6. Next Game Panel (Right Panel - Bottom)

| Property | Value |
|----------|-------|
| Figma ID | `15:4371` |
| Dimensions | 320 x 251 px |
| Position | y=501 (below Score Panel, 16px gap) |

### Layout
```
+---------- 320 x 251 ----------+
|  [21px pad]                    |
|  "NEXT GAME" (centered, 89w)  |  y=21
|                                |
|  +--- 278 x 256 card area --+ |  y=57
|  | BANKER (131w) | 16px gap | PLAYER (131w) |
|  |               |          |               |
|  | Label "BANKER" (full w)  | Label "PLAYER" (full w) |
|  |                          |                         |
|  | Card slots:              | Card slots:             |
|  | [B] 32x31 @ (49.5, 0)   | [P] 32x30 @ (49.5, 0)  |
|  | [ ] 24x24 @ (53.5, 39)  | [ ] 24x24 @ (53.5, 38)  |
|  | [ ] 24x24 @ (53.5, 71)  | [ ] 24x24 @ (53.5, 70)  |
|  | [+] 23x23 rounded rect  | [+] 23x23 rounded rect  |
|  +----------------------------------------------+
+--------------------------------+
```

**Card slot details:**
- First slot: 32 x 31 px, contains letter ("B" or "P") centered
- Second slot: 24 x 24 px, empty (card placeholder)
- Third slot: 24 x 24 px, empty (card placeholder)
- Draw indicator: rounded rectangle 23 x 23 px at bottom-right of column

---

## 7. Colors [NEEDS FIGMA DETAIL]

The sparse metadata export does **not** include color values. The following colors need to be extracted from the Figma file via `get_design_context` on individual sub-layer IDs, or from the Figma screenshot:

### Sub-layer IDs to query for colors:

| Element | ID to query | Expected color purpose |
|---------|-------------|----------------------|
| Header background | `15:3022` | Dark header bar |
| Footer background | `15:4401` | Dark footer bar |
| Main content background | `15:3032` | Dark background |
| Bead Road panel bg | `15:3033` | Panel/card background |
| Big Road panel bg | `15:3338` | Panel/card background |
| Score panel bg | `15:4319` | Panel/card background |
| Next Game panel bg | `15:4371` | Panel/card background |
| BANKER score dot | `15:4325` | Red (banker color) |
| PLAYER score dot | `15:4332` | Blue (player color) |
| TIE score dot | `15:4339` | Green (tie color) |
| LIVE indicator dot | `15:4405` | Green pulse dot |
| Bead Road cell (inner) | `24:7493` | Banker=red, Player=blue, Tie=green |
| Big Road cell (inner) | `23:29004` | Banker=red, Player=blue |
| Big Eye markers | Group 14/15 | Derived road colors |
| Next Game card slot | `15:4379` | Card background |
| Draw indicator rect | `23:4484` | Draw button color |
| Betting zone text | `15:4438` | Min/max text color |
| Header overlay bg | - | Semi-transparent overlay? |

### Typical Baccarat UI Color Palette (reference)

Based on standard baccarat conventions (to be confirmed against Figma):

| Element | Typical Color | Notes |
|---------|---------------|-------|
| Banker | `#DC2626` / Red | Used for dots, cells, labels |
| Player | `#2563EB` / Blue | Used for dots, cells, labels |
| Tie | `#16A34A` / Green | Used for dots, cells, line |
| Background | `#0F172A` / Dark slate | Deep dark background |
| Panel background | `#1E293B` / Slate 800 | Card/panel surfaces |
| Text primary | `#F8FAFC` / White | Main text color |
| Text secondary | `#94A3B8` / Slate 400 | Muted labels |
| Grid lines | `#334155` / Slate 700 | Road grid lines |
| LIVE indicator | `#22C55E` / Green 500 | Pulsing green dot |
| Lucky 6 | `#F59E0B` / Amber | Side bet highlight |
| Dragon 7 | `#8B5CF6` / Violet | Side bet highlight |
| Panda 8 | `#EC4899` / Pink | Side bet highlight |

---

## 8. Typography [NEEDS FIGMA DETAIL]

The sparse export does not include font information. Sizes can be inferred from element heights:

| Element | Height (px) | Inferred Font Size | Weight (guess) | Purpose |
|---------|-------------|--------------------|----|---------|
| "BEAD ROAD" title | 16 | ~11-12px | Bold / Semibold | Section titles |
| "BIG ROAD" label | 20 | ~14px | Bold | Road section header |
| "Game #18" | 16 | ~11-12px | Regular | Game counter |
| Score labels (BANKER etc.) | 20 | ~14px | Medium | Score row labels |
| Score numbers (8, 9, 1) | 32 | ~24px | Bold | Score values |
| "NEXT GAME" | 20 | ~14px | Bold / Semibold | Section header |
| "BANKER" / "PLAYER" column header | 16 | ~11-12px | Medium | Column labels |
| Card letter "B" / "P" | 16 | ~11-12px | Regular | Card placeholders |
| Footer text (LIVE, Table, Dealer) | 20 | ~14px | Regular | Status info |
| MIN/MAX values | 20 | ~14px | Regular | Betting limits |
| "Lucky 6", "Pair / Tie" etc. | 20 | ~14px | Regular | Bet type labels |
| "BIG EYE", "SMALL ROAD", "COCKROACH PIG" | 16 | ~11-12px | Bold | Road sub-section titles |

### Sub-layer IDs to query for typography:
- Any text node ID (e.g., `15:3035`, `15:3341`, `15:4327`, `15:4329`, `15:4373`)

**Expected font family:** A sans-serif font (likely Inter, Roboto, or a similar system font).

---

## 9. Asset URLs [NEEDS FIGMA DETAIL]

No asset URLs are present in the sparse metadata. Assets to extract:

| Asset | Figma ID | Description |
|-------|----------|-------------|
| Playroom Gaming Logo | `15:4431` | 150 x 80 px image in header |
| Settings Icon | `15:4451` | 24 x 24 px icon in header |
| LIVE dot | `15:4405` | 8 x 8 circle (may be CSS, not asset) |
| Score row color dots | `15:4325`, `15:4332`, `15:4339` | 16 x 16 circles (CSS) |

To export assets from Figma, use `get_design_context` or `get_screenshot` on these IDs.

---

## 10. Spacing & Sizing Summary

### Global spacing
| Token | Value | Usage |
|-------|-------|-------|
| Page padding | 24px | Around main content area |
| Column gap | 24px | Between Bead Road, Roads, and Right Panel |
| Section gap (vertical) | 16px | Between Big Road and Big Eye, between Score and Next Game panels |
| Panel inner padding | 13px | Bead Road, Big Eye, Small Road, Cockroach Pig title padding |
| Big Road inner padding | 17px | Padding inside Big Road container |

### Component sizes
| Component | Width | Height |
|-----------|-------|--------|
| Full app | 1534 | 925 |
| Header | 1534 | 62 |
| Footer | 1534 | 45 |
| Main content | 1534 | 818 |
| Bead Road panel | 128 | 502 |
| Roads panel | 990 | 751 |
| Big Road | 990 | 458 |
| Big Eye row | 990 | 132 |
| Small Road + Cockroach row | 990 | 132 |
| Small Road | 495 | 132 |
| Cockroach Pig | 482 | 132 |
| Right Panel | 320 | 751 |
| Score Panel | 320 | 485 |
| Next Game Panel | 320 | 251 |
| Score row | 278 | 48 |
| Grid cell (Big Road, Bead) | 20 | 20 |
| Grid cell inner circle | 16 | 16 |
| Big Eye/Small/Cockroach cell | ~21 | ~22 |
| Card slot (first) | 32 | 31 |
| Card slot (2nd, 3rd) | 24 | 24 |
| Draw indicator | 23 | 23 |
| Logo | 150 | 80 |
| Settings button | 24 | 24 |
| LIVE dot | 8 | 8 |
| Betting zone (min/max) | 193 | 20 |

### Grid cell spacing
| Grid | Cell W | Cell H | Gap H | Gap V |
|------|--------|--------|-------|-------|
| Bead Road | 20 | 20 | ~1.67 | 2 |
| Big Road | 20 | 20 | ~1.67 | 2 |
| Big Eye | ~21 | ~22 | 0 | 0 |
| Small Road | ~21 | ~22 | 0 | 0 |
| Cockroach Pig | ~21 | ~22 | 0 | 0 |

---

## 11. Figma Node IDs for Follow-up Queries

To get full styling (colors, fonts, effects, borders), call `get_design_context` on these sub-layer IDs individually:

### Priority 1 - Panel backgrounds & colors
```
15:3022  Header
15:3032  Main Content Container
15:3033  Bead Road Panel
15:3338  Big Road Panel
15:3730  Big Eye Container
15:3729  Bottom Roads Container (Small Road + Cockroach)
15:4319  Score Panel
15:4371  Next Game Panel
15:4401  Footer
```

### Priority 2 - Score rows & interactive elements
```
15:4323  BANKER score row
15:4330  PLAYER score row
15:4337  TIE score row
23:28274 BANKER PAIR row 1
23:28281 BANKER PAIR row 2 (likely PLAYER PAIR)
23:28288 LUCKY 6 row
23:28296 DRAGON 7 row
23:28303 PANDA 8 row
23:28311 GAME NUMBER row
15:4375  BANKER card column
15:4384  PLAYER card column
```

### Priority 3 - Grid cells & markers
```
24:7493  Bead Road cell (inner)
23:29004 Big Road cell (inner)
24:7366  Big Eye grid frame
24:6650  Small Road grid frame
24:6942  Cockroach Pig grid frame
```

### Priority 4 - Typography samples
```
15:3035  "BEAD ROAD" text
15:3341  "BIG ROAD" text
15:4327  "BANKER" label
15:4329  "8" score number
15:4373  "NEXT GAME" text
15:4407  "LIVE" text
15:4438  "MIN:$20" text
```

### Priority 5 - Assets
```
15:4431  Playroom Gaming logo image
15:4451  Settings icon
```

---

## 12. Implementation Notes

### Suggested React Component Structure
```
<StudioLayout>                    <!-- 1534x925, dark bg -->
  <Header>                        <!-- 1534x62, absolute positioned overlays -->
    <Logo />                      <!-- 150x80, Playroom Gaming -->
    <BettingZone label="Main" />
    <BettingZone label="Pair / Tie" />
    <BettingZone label="Lucky 6" />
    <BettingZone label="Dragon 7 / Panda" />
    <SettingsButton />
  </Header>

  <MainContent>                   <!-- 3-column flex layout, 24px gap -->
    <BeadRoadPanel>
      <SectionTitle>BEAD ROAD</SectionTitle>
      <BeadGrid cols={5} rows={20} cellSize={20} />
    </BeadRoadPanel>

    <RoadsPanel>
      <BigRoad>
        <SectionTitle>BIG ROAD</SectionTitle>
        <GameCounter>#18</GameCounter>
        <RoadGrid cols={44} rows={18} cellSize={20} />
      </BigRoad>
      <BigEyeRoad>
        <SectionTitle>BIG EYE</SectionTitle>
        <DerivedRoadGrid cols={44} rows={4} cellSize={21} />
      </BigEyeRoad>
      <BottomRoads>
        <SmallRoad>
          <SectionTitle>SMALL ROAD</SectionTitle>
          <DerivedRoadGrid cols={22} rows={4} cellSize={21} />
        </SmallRoad>
        <CockroachPig>
          <SectionTitle>COCKROACH PIG</SectionTitle>
          <DerivedRoadGrid cols={22} rows={4} cellSize={21} />
        </CockroachPig>
      </BottomRoads>
    </RoadsPanel>

    <RightPanel>
      <ScorePanel>
        <ScoreRow label="BANKER" color="red" value={8} />
        <ScoreRow label="PLAYER" color="blue" value={9} />
        <ScoreRow label="TIE" color="green" value={1} />
        <ScoreRow label="BANKER PAIR" color="red" value={8} hasPairDot />
        <ScoreRow label="PLAYER PAIR" color="blue" value={9} hasPairDot />
        <ScoreRow label="LUCKY 6" color="amber" value={1} />
        <ScoreRow label="DRAGON 7" color="violet" value={9} />
        <ScoreRow label="PANDA 8" color="pink" value={1} />
        <ScoreRow label="GAME NUMBER" value={1} />
      </ScorePanel>
      <NextGamePanel>
        <SectionTitle>NEXT GAME</SectionTitle>
        <CardColumn side="BANKER">
          <CardSlot label="B" size={32} />
          <CardSlot size={24} />
          <CardSlot size={24} />
          <DrawIndicator />
        </CardColumn>
        <CardColumn side="PLAYER">
          <CardSlot label="P" size={32} />
          <CardSlot size={24} />
          <CardSlot size={24} />
          <DrawIndicator />
        </CardColumn>
      </NextGamePanel>
    </RightPanel>
  </MainContent>

  <Footer>
    <LiveIndicator />              <!-- Green pulsing dot + "LIVE" -->
    <TableInfo>PRG-01</TableInfo>
    <DealerInfo>Sarah M.</DealerInfo>
    <Timestamp>12:45:32</Timestamp>
  </Footer>
</StudioLayout>
```

### Tailwind CSS Mapping (suggested)

```css
/* Layout */
.studio-layout    { @apply w-[1534px] h-[925px] bg-slate-950 text-white; }
.header           { @apply w-full h-[62px] relative; }
.main-content     { @apply flex gap-6 p-6; }
.footer           { @apply w-full h-[45px] px-6 py-3 flex items-center justify-between; }

/* Panels */
.bead-road-panel  { @apply w-[128px] h-[502px] rounded-lg bg-slate-800/50 p-3; }
.roads-panel      { @apply w-[990px] flex flex-col gap-4; }
.big-road         { @apply h-[458px] rounded-lg bg-slate-800/50; }
.big-eye          { @apply h-[132px] rounded-lg bg-slate-800/50; }
.bottom-roads     { @apply h-[132px] flex gap-0; }
.small-road       { @apply w-[495px] rounded-lg bg-slate-800/50; }
.cockroach-pig    { @apply w-[482px] rounded-lg bg-slate-800/50 ml-[11px]; }
.right-panel      { @apply w-[320px] flex flex-col; }
.score-panel      { @apply h-[485px] rounded-lg bg-slate-800/50; }
.next-game-panel  { @apply h-[251px] rounded-lg bg-slate-800/50 mt-4; }

/* Grid cells */
.road-cell        { @apply w-5 h-5 flex items-center justify-center; }
.road-cell-inner  { @apply w-4 h-4 rounded-full; }
.derived-cell     { @apply w-[21px] h-[22px]; }

/* Score rows */
.score-row        { @apply w-[278px] h-12 flex items-center justify-between px-2; }
.score-value      { @apply text-2xl font-bold; }

/* Cards */
.card-slot-lg     { @apply w-8 h-8 rounded border; }
.card-slot-sm     { @apply w-6 h-6 rounded border; }
.draw-indicator   { @apply w-[23px] h-[23px] rounded; }
```

---

## 13. Text Content Inventory

All text elements present in the design:

| Text | Context | Element Height |
|------|---------|---------------|
| BEAD ROAD | Section title | 16px |
| BIG ROAD | Section title | 20px |
| Game #18 | Game counter in Big Road header | 16px |
| BIG EYE | Section title | 16px |
| SMALL ROAD | Section title | 16px |
| COCKROACH PIG | Section title | 16px |
| BANKER | Score row label | 20px |
| PLAYER | Score row label | 20px |
| TIE | Score row label | 20px |
| BANKER PAIR | Score row label (x2) | 20px |
| LUCKY 6 | Score row label | 20px |
| DRAGON 7 | Score row label | 20px |
| PANDA 8 | Score row label | 20px |
| GAME NUMBER | Score row label | 20px |
| 8, 9, 1 | Score values | 32px |
| NEXT GAME | Section title | 20px |
| BANKER | Card column header | 16px |
| PLAYER | Card column header | 16px |
| B | Card label | 16px |
| P | Card label | 16px |
| LIVE | Footer status | 20px |
| Table: PRG-01 | Footer table ID | 20px |
| Dealer: Sarah M. | Footer dealer name | 20px |
| Last Updated: 12:45:32 | Footer timestamp | 20px |
| MIN:$20 | Betting limit (x4) | 20px |
| MAX:$50,000 | Betting limit (x4) | 20px |
| Lucky 6 | Bet zone label | 20px |
| Pair / Tie | Bet zone label | 20px |
| Dragon 7 / Panda | Bet zone label | 20px |

---

## 14. Responsive Considerations

The Figma design is a fixed 1534 x 925 layout, suitable for a 1080p+ studio monitor display. For responsive implementation:

- The primary target is a **landscape display** (dealer studio monitor, ~16:9)
- The design likely does NOT need mobile responsiveness (it is a dealer-facing operational UI)
- Consider scaling the entire layout proportionally for different monitor sizes
- The grid column counts (44 cols for Big Road, 22 for derived roads) are standard baccarat sizes
- The Bead Road (5 cols x 20 rows) follows traditional baccarat bead plate layout

---

## Appendix: All Figma Node IDs

<details>
<summary>Top-level frame IDs</summary>

```
15:3020  Baccarat Dealer UI (root)
15:3021  App
15:3022  Header
15:3032  Container (Main Content)
15:3033  Bead Road Panel
15:3337  Roads Panel
15:3338  Big Road
15:3730  Big Eye Container
15:3729  Bottom Roads (Small + Cockroach)
15:3926  Small Road
15:4122  Cockroach Pig
15:4318  Right Panel
15:4319  Score Panel
15:4371  Next Game Panel
15:4401  Footer
15:4431  Logo Image
15:4437  Bet Zone 1
15:4441  Bet Zone 2
15:4444  Bet Zone 3
15:4447  Bet Zone 4
15:4450  Settings Button
```

</details>
