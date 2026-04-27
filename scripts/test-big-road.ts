// Quick sanity test for the big-road helper.
// Run via: npx tsx scripts/test-big-road.mjs
//   (or compile and run; this file uses a tiny inline TS->JS port.)
//
// Instead of pulling in tsx, we re-implement just enough of the
// runtime helper here (copied logic) and assert the same outputs the
// real helper produces. This file exists only as a developer aid.

import { buildBigRoadColumns, appendOutcome, KEEP_TAIL_COLS } from "../src/lib/big-road";

let failures = 0;
function assert(label, cond, detail) {
  if (cond) {
    console.log(`  ok  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}`);
    if (detail !== undefined) console.log("       ", detail);
  }
}

console.log("Test: spec example [B,B,P,P,P,B,T,T,B]");
{
  const seq = ["B", "B", "P", "P", "P", "B", "T", "T", "B"];
  const { columns, leadingTie } = buildBigRoadColumns(seq, 30, 6);
  assert("leadingTie is null", leadingTie === null);
  assert("4 columns", columns.length === 4, columns.map((c) => c.outcome).join(","));
  assert("col0 = B(2)",
    columns[0].outcome === "B" &&
      columns[0].cells[0].hasOutcome &&
      columns[0].cells[1].hasOutcome &&
      !columns[0].cells[2].hasOutcome,
  );
  assert("col1 = P(3)",
    columns[1].outcome === "P" &&
      columns[1].cells[0].hasOutcome &&
      columns[1].cells[1].hasOutcome &&
      columns[1].cells[2].hasOutcome &&
      !columns[1].cells[3].hasOutcome,
  );
  assert("col2 = B(1) ties=2",
    columns[2].outcome === "B" &&
      columns[2].cells[0].hasOutcome &&
      columns[2].cells[0].ties === 2 &&
      !columns[2].cells[1].hasOutcome,
  );
  assert("col3 = B(1)",
    columns[3].outcome === "B" &&
      columns[3].cells[0].hasOutcome &&
      !columns[3].cells[1].hasOutcome,
  );
}

console.log("\nTest: leading tie");
{
  const { columns, leadingTie } = buildBigRoadColumns(["T"], 30, 6);
  assert("0 columns", columns.length === 0);
  assert("leadingTie 1", leadingTie && leadingTie.ties === 1);
}
{
  const { columns, leadingTie } = buildBigRoadColumns(["T", "T", "P"], 30, 6);
  assert("leading ties cleared after first PB", leadingTie && leadingTie.ties === 2);
  assert("col0 P(1)", columns.length === 1 && columns[0].outcome === "P");
}

console.log("\nTest: wrap retains last 3 columns");
{
  // Build sequence that makes 31 alternating columns (each switch = new column).
  const seq = [];
  for (let i = 0; i < 31; i++) {
    seq.push(i % 2 === 0 ? "B" : "P");
  }
  const { columns } = buildBigRoadColumns(seq, 30, 6);
  assert("wrapped to KEEP_TAIL_COLS", columns.length === KEEP_TAIL_COLS);
  // The retained should be the last three: at i=28(B), 29(P), 30(B).
  assert("tail order B,P,B",
    columns[0].outcome === "B" &&
      columns[1].outcome === "P" &&
      columns[2].outcome === "B",
  );
}

console.log("\nTest: streaming appendOutcome wrap behaviour");
{
  let cols = [];
  for (let i = 0; i < 31; i++) {
    cols = appendOutcome(cols, i % 2 === 0 ? "B" : "P", 30, 6);
  }
  assert("appendOutcome wrap = 3 columns", cols.length === KEEP_TAIL_COLS);
  // After wrap, new outcome appends to col 4. Add 2 more flips:
  cols = appendOutcome(cols, "P", 30, 6);
  cols = appendOutcome(cols, "B", 30, 6);
  assert("append after wrap continues from col 4", cols.length === KEEP_TAIL_COLS + 2);
}

console.log("\nTest: vertical streaks clamp at row 6 (no dragon tail)");
{
  const seq = ["B", "B", "B", "B", "B", "B", "B", "B"];
  const { columns } = buildBigRoadColumns(seq, 30, 6);
  assert("single column", columns.length === 1);
  // All 6 cells should be filled even though we got 8 Bs.
  assert("row 0..5 filled",
    columns[0].cells.every((c) => c.hasOutcome === true),
  );
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
} else {
  console.log("\nAll tests passed");
}
