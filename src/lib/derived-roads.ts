/**
 * Derived roads (Big Eye Boy, Small Road, Cockroach Pig) and the Bead Plate.
 *
 * All four are pure functions of the same outcome list the Big Road is built
 * from, so nothing here touches the network or React.
 *
 * The three derived roads answer "is the shoe patterned or choppy?" by
 * comparing the streak column the Big Road is currently writing with an
 * earlier one:
 *
 *   Big Eye Boy   looks 1 column back
 *   Small Road    looks 2 columns back
 *   Cockroach Pig looks 3 columns back
 *
 * They read the Big Road as a list of streak DEPTHS (ties ignored), which is
 * the widely used simplification: our visual Big Road clamps long streaks at
 * six rows instead of turning a "dragon tail", and depth-based logic is
 * correct regardless of how the tail is drawn.
 *
 * Rule, for a new Big Road cell at streak column `c`, row `r`, offset `k`:
 *   - `r === 0` (a new column just started): compare the depth of the column
 *     that just ended (`c - 1`) with the one `k` before it (`c - 1 - k`).
 *     Same depth -> red, different -> blue. Needs `c - 1 - k >= 0`.
 *   - `r > 0` (the streak got deeper): look at column `c - k` at the same row.
 *     Occupied -> red. Empty but occupied one row up (that column ended
 *     exactly here) -> blue. Empty two rows up too (it ended earlier) -> red.
 *     Needs `c - k >= 0`.
 *
 * Each derived road is then laid out exactly like a Big Road, with red and
 * blue taking the place of Banker and Player, so `buildBigRoadColumns` is
 * reused for the grid geometry and wrap behaviour.
 */

import {
  buildBigRoadColumns,
  type BigRoadResult,
  type Outcome,
  type Side,
} from "./big-road";

/** A derived-road mark. Red = "pattern repeats", blue = "pattern broke". */
export type Mark = "red" | "blue";

export type DerivedRoadKind = "bigEye" | "smallRoad" | "cockroach";

export const DERIVED_ROAD_KINDS: DerivedRoadKind[] = [
  "bigEye",
  "smallRoad",
  "cockroach",
];

const OFFSET: Record<DerivedRoadKind, number> = {
  bigEye: 1,
  smallRoad: 2,
  cockroach: 3,
};

function normalize(o: Outcome): Side | "T" {
  if (o === "Banker" || o === "B") return "B";
  if (o === "Player" || o === "P") return "P";
  return "T";
}

/**
 * Big Road as streak depths, ties dropped. `[3, 1, 2]` is BBB P PP (or the
 * mirror image); the sides don't matter to the derived roads, only depths.
 */
export function streakDepths(outcomes: Outcome[]): number[] {
  const depths: number[] = [];
  let last: Side | null = null;
  for (const raw of outcomes) {
    const side = normalize(raw);
    if (side === "T") continue;
    if (side === last) {
      depths[depths.length - 1] += 1;
    } else {
      depths.push(1);
      last = side;
    }
  }
  return depths;
}

/**
 * The sequence of marks for one derived road. Replays the Big Road cell by
 * cell and applies the rule above at every cell that has enough history.
 */
export function derivedMarks(outcomes: Outcome[], kind: DerivedRoadKind): Mark[] {
  const k = OFFSET[kind];
  const marks: Mark[] = [];
  const depths: number[] = [];
  let last: Side | null = null;

  for (const raw of outcomes) {
    const side = normalize(raw);
    if (side === "T") continue;

    if (side === last) {
      depths[depths.length - 1] += 1;
      const c = depths.length - 1;
      const r = depths[c] - 1;
      const ref = c - k;
      if (ref < 0) continue;
      const refDepth = depths[ref];
      // Occupied at this row, or already ended before the row above: red.
      // Ended exactly one row up: blue.
      marks.push(refDepth === r ? "blue" : "red");
    } else {
      depths.push(1);
      last = side;
      const c = depths.length - 1;
      const a = c - 1;
      const b = c - 1 - k;
      if (b < 0) continue;
      marks.push(depths[a] === depths[b] ? "red" : "blue");
    }
  }
  return marks;
}

/**
 * Grid layout for one derived road, in Big Road column form so the shared
 * wrap logic applies. `outcome: "B"` carries red, `"P"` carries blue.
 */
export function buildDerivedRoad(
  outcomes: Outcome[],
  kind: DerivedRoadKind,
  maxCols: number,
  rows = 6,
): BigRoadResult {
  const asSides: Outcome[] = derivedMarks(outcomes, kind).map((m) =>
    m === "red" ? "B" : "P",
  );
  return buildBigRoadColumns(asSides, maxCols, rows);
}

export function markToSide(mark: Mark): Side {
  return mark === "red" ? "B" : "P";
}

export function sideToMark(side: Side): Mark {
  return side === "B" ? "red" : "blue";
}

/**
 * "Ask road": the mark each derived road would draw if the next result were
 * `side`. `null` means that road has not started yet and would draw nothing.
 */
export function askRoad(
  outcomes: Outcome[],
  side: Side,
): Record<DerivedRoadKind, Mark | null> {
  const next: Outcome[] = [...outcomes, side];
  const out = {} as Record<DerivedRoadKind, Mark | null>;
  for (const kind of DERIVED_ROAD_KINDS) {
    const before = derivedMarks(outcomes, kind).length;
    const after = derivedMarks(next, kind);
    out[kind] = after.length > before ? after[after.length - 1] : null;
  }
  return out;
}

/* ── Bead plate ─────────────────────────────────────────────────────────── */

export interface BeadCell {
  side: Side | "T";
}

/**
 * Chronological grid, column-major, `rows` tall: entry `i` sits at column
 * `floor(i / rows)`, row `i % rows`. Ties get their own cell here, unlike the
 * Big Road. When there are more columns than fit, the oldest fall off the
 * left so the newest are always on screen.
 */
export function buildBeadPlate(
  outcomes: Outcome[],
  maxCols: number,
  rows = 6,
): (BeadCell | null)[][] {
  const cols: (BeadCell | null)[][] = [];
  outcomes.forEach((raw, i) => {
    const c = Math.floor(i / rows);
    const r = i % rows;
    if (!cols[c]) cols[c] = new Array(rows).fill(null);
    cols[c][r] = { side: normalize(raw) };
  });
  return cols.length > maxCols ? cols.slice(cols.length - maxCols) : cols;
}
