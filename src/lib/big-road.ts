/**
 * Big Road column builder for baccarat scoreboards.
 *
 * Produces dragon-style columns from a flat list of round outcomes:
 *   - Each new same-side outcome extends the streak DOWN in its column.
 *   - A switch (Banker <-> Player) starts a new column to the right.
 *   - Ties don't get their own column; they stack on the most recent
 *     non-Tie cell as a `ties` count.
 *   - If the column would extend past `rows`, the cell is clamped to the
 *     last row (basic L-shape only; deeper "dragon tail" wrap is
 *     intentionally deferred per spec).
 *
 * Wrap behaviour:
 *   When the columns would exceed `maxCols`, retain only the last
 *   `KEEP_TAIL_COLS` non-empty columns and rebuild from there. This is a
 *   purely visual concern -- the caller's underlying outcome list is
 *   not mutated.
 */

export type Outcome = "Banker" | "Player" | "Tie" | "B" | "P" | "T";

export type Side = "B" | "P";

export interface BigRoadCell {
  /** Whether this cell is occupied by the column's outcome. */
  hasOutcome: boolean;
  /** Number of ties stacked on this cell (0 if none). */
  ties: number;
}

export interface BigRoadColumn {
  /** Side of the streak (Banker or Player). */
  outcome: Side;
  /** Cells from top to bottom; length === `rows`. */
  cells: BigRoadCell[];
}

/**
 * Number of trailing non-empty columns to retain when the visible grid
 * fills up. The spec calls this the "last 3 dragon columns".
 */
export const KEEP_TAIL_COLS = 3;

function normalize(o: Outcome): Side | "T" {
  if (o === "Banker" || o === "B") return "B";
  if (o === "Player" || o === "P") return "P";
  return "T";
}

function makeEmptyCells(rows: number): BigRoadCell[] {
  const cells: BigRoadCell[] = new Array(rows);
  for (let i = 0; i < rows; i++) {
    cells[i] = { hasOutcome: false, ties: 0 };
  }
  return cells;
}

/**
 * Render-only carrier for the case where the very first event(s) are
 * Ties before any Banker/Player has been recorded. Per spec, render
 * a single green dot at row 0 col 0 with a count badge.
 */
export interface LeadingTie {
  ties: number;
}

export interface BigRoadResult {
  columns: BigRoadColumn[];
  /** Set when no Banker/Player has happened yet but ties have. */
  leadingTie: LeadingTie | null;
}

/**
 * Build big road columns from a flat outcome list.
 *
 * @param outcomes - flat list (P/B/T or Player/Banker/Tie)
 * @param maxCols  - visible column count (default 30)
 * @param rows     - column height (default 6, baccarat standard)
 */
export function buildBigRoadColumns(
  outcomes: Outcome[],
  maxCols = 30,
  rows = 6,
): BigRoadResult {
  if (rows <= 0 || maxCols <= 0) {
    return { columns: [], leadingTie: null };
  }

  // Phase 1: build the *unbounded* set of columns from outcomes.
  //
  // Tie handling note: per spec, ties stack on the last non-Tie cell as
  // a counter and ALSO break the current streak so the next same-side
  // outcome starts a new column (per the verification example
  // `[B,B,P,P,P,B,T,T,B]` -> `[B(2), P(3), B(1) ties=2, B(1)]`).
  const columns: BigRoadColumn[] = [];
  let leadingTies = 0;
  let lastRowIdx = -1;
  let streakBrokenByTie = false;

  for (const raw of outcomes) {
    const side = normalize(raw);

    if (side === "T") {
      const lastCol = columns[columns.length - 1];
      if (!lastCol) {
        leadingTies += 1;
        continue;
      }
      // Stack on the most recent occupied cell of the last column.
      const cell = lastCol.cells[lastRowIdx];
      if (cell) cell.ties += 1;
      streakBrokenByTie = true;
      continue;
    }

    const lastCol = columns[columns.length - 1];
    const sameSide = lastCol && lastCol.outcome === side;
    if (!lastCol || !sameSide || streakBrokenByTie) {
      // New column on side switch, first-ever non-Tie event, or after
      // a tie has interrupted the previous streak.
      const newCol: BigRoadColumn = {
        outcome: side,
        cells: makeEmptyCells(rows),
      };
      newCol.cells[0] = { hasOutcome: true, ties: 0 };
      columns.push(newCol);
      lastRowIdx = 0;
      streakBrokenByTie = false;
      continue;
    }

    // Continue same streak: place at next row down, clamped to last row.
    let nextRow = lastRowIdx + 1;
    if (nextRow >= rows) nextRow = rows - 1;
    // If we clamped to the last row and it's already filled, this is the
    // "dragon tail" wrap which we defer; just no-op visually so the data
    // still lives in the columns list.
    const target = lastCol.cells[nextRow];
    if (!target.hasOutcome) {
      target.hasOutcome = true;
      target.ties = 0;
    }
    lastRowIdx = nextRow;
  }

  // Phase 2: apply visible-window wrap. The rule (per spec):
  //   When columns.length would exceed maxCols, keep the trailing
  //   KEEP_TAIL_COLS columns as the new leftmost columns. Anything
  //   already past that gets rebuilt from those tail columns plus
  //   subsequent outcomes -- but since we've already laid out columns
  //   from the full outcome list, the simplest faithful expression is:
  //   if we overflow, slice the trailing columns and pretend they are
  //   the start of the visible window again.
  //
  // The repeated-overflow case: keep wrapping while still over capacity.
  //   This means after the wrap to last-3, the remaining new columns
  //   beyond column 4 onward fill in normally; if they overflow again,
  //   we wrap again. Because we're working from the full outcome list
  //   and the wrap is purely a tail-slice, we can iterate.
  let visibleColumns = columns;
  while (visibleColumns.length > maxCols) {
    const tail = visibleColumns.slice(-KEEP_TAIL_COLS);
    // Whatever overflowed past the kept tail: nothing further to do --
    // there are no "future" outcomes left to reapply since we've already
    // consumed the whole outcome list. The next wrap iteration only
    // triggers if the slice itself somehow still exceeds maxCols, which
    // can't happen when KEEP_TAIL_COLS < maxCols.
    visibleColumns = tail;
  }

  return {
    columns: visibleColumns,
    leadingTie: leadingTies > 0 ? { ties: leadingTies } : null,
  };
}

/**
 * Streaming-friendly variant: given an existing visible-window
 * column list and a new outcome, return the next visible column list.
 *
 * Useful when you want to mirror the spec exactly -- after a wrap, the
 * tail of 3 columns becomes the leftmost three and *new* outcomes
 * append from column 4 onward up to maxCols again. This is what the
 * caller would use if it tracked columns over time instead of
 * rebuilding from a flat list each tick.
 *
 * Currently unused in the React surfaces (they rebuild each render),
 * exported for unit testing and future use.
 */
export function appendOutcome(
  prev: BigRoadColumn[],
  outcome: Outcome,
  maxCols = 30,
  rows = 6,
): BigRoadColumn[] {
  const side = normalize(outcome);
  const next = prev.map((col) => ({
    outcome: col.outcome,
    cells: col.cells.map((c) => ({ ...c })),
  }));

  if (side === "T") {
    const last = next[next.length - 1];
    if (!last) return next; // leading tie, ignored at column level
    // Find the last occupied cell.
    for (let i = last.cells.length - 1; i >= 0; i--) {
      if (last.cells[i].hasOutcome) {
        last.cells[i].ties += 1;
        break;
      }
    }
    return next;
  }

  const last = next[next.length - 1];

  // Detect whether the previous outcome was a tie -- in that case the
  // streak is considered broken and the next same-side outcome starts
  // a new column (mirrors buildBigRoadColumns semantics).
  let priorWasTie = false;
  if (last) {
    for (let i = last.cells.length - 1; i >= 0; i--) {
      if (last.cells[i].hasOutcome) {
        priorWasTie = last.cells[i].ties > 0;
        break;
      }
    }
  }

  const sameSide = !!last && last.outcome === side;
  if (!last || !sameSide || priorWasTie) {
    const col: BigRoadColumn = {
      outcome: side,
      cells: makeEmptyCells(rows),
    };
    col.cells[0] = { hasOutcome: true, ties: 0 };
    next.push(col);
  } else {
    // Find next empty row, clamp to last.
    let placed = false;
    for (let i = 0; i < last.cells.length; i++) {
      if (!last.cells[i].hasOutcome) {
        last.cells[i] = { hasOutcome: true, ties: 0 };
        placed = true;
        break;
      }
    }
    if (!placed) {
      // Defer dragon tail; clamp to bottom (already there).
    }
  }

  if (next.length > maxCols) {
    return next.slice(-KEEP_TAIL_COLS);
  }
  return next;
}
