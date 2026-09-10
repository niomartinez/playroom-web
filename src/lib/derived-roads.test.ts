/**
 * Derived roads + bead plate.
 *
 * Run with `npx tsx src/lib/derived-roads.test.ts` — the repo has no unit
 * runner (Playwright only), so this is a plain assert script.
 *
 * Every expectation below was worked by hand against the standard rules
 * (see the header of derived-roads.ts). The shoe shapes are kept tiny so a
 * reader can replay them on paper.
 */
import assert from "node:assert/strict";
import {
  askRoad,
  buildBeadPlate,
  buildDerivedRoad,
  derivedMarks,
  streakDepths,
} from "./derived-roads";

/* streakDepths */
assert.deepEqual(streakDepths([]), []);
assert.deepEqual(streakDepths(["B", "B", "P", "P", "P", "B"]), [2, 3, 1]);
assert.deepEqual(streakDepths(["T", "B", "T", "B", "P"]), [2, 1], "ties are dropped");
assert.deepEqual(streakDepths(["Banker", "Player", "Tie"]), [1, 1], "long names");

/* Big Eye Boy — starts at big-road col 1 row 1 or col 2 row 0 */
assert.deepEqual(derivedMarks(["B"], "bigEye"), []);
assert.deepEqual(derivedMarks(["B", "B", "P"], "bigEye"), [], "col 1 row 0: too early");
assert.deepEqual(
  derivedMarks(["B", "B", "P", "P"], "bigEye"),
  ["red"],
  "col 1 row 1: previous column occupied at row 1",
);
assert.deepEqual(
  derivedMarks(["B", "P", "B"], "bigEye"),
  ["red"],
  "col 2 row 0: the two previous columns have equal depth",
);
assert.deepEqual(
  derivedMarks(["B", "B", "P", "B"], "bigEye"),
  ["blue"],
  "col 2 row 0: previous columns differ in depth",
);
assert.deepEqual(
  derivedMarks(["B", "B", "P", "P", "P"], "bigEye"),
  ["red", "blue"],
  "col 1 row 2: previous column ended exactly one row up",
);
assert.deepEqual(
  derivedMarks(["B", "B", "P", "P", "P", "P"], "bigEye"),
  ["red", "blue", "red"],
  "col 1 row 3: previous column ended two rows up",
);
assert.deepEqual(
  derivedMarks(["B", "T", "B", "P", "T", "P"], "bigEye"),
  ["red"],
  "ties never produce a mark and never break the streak",
);

/* Small Road — starts at col 2 row 1 or col 3 row 0 */
assert.deepEqual(derivedMarks(["B", "P", "B"], "smallRoad"), []);
assert.deepEqual(derivedMarks(["B", "P", "B", "P"], "smallRoad"), ["red"]);
assert.deepEqual(derivedMarks(["B", "B", "P", "B", "P"], "smallRoad"), ["blue"]);
assert.deepEqual(
  derivedMarks(["B", "B", "P", "B", "B"], "smallRoad"),
  ["red"],
  "col 2 row 1 vs col 0 (depth 2): occupied",
);

/* Cockroach Pig — starts at col 3 row 1 or col 4 row 0 */
assert.deepEqual(derivedMarks(["B", "P", "B", "P"], "cockroach"), []);
assert.deepEqual(derivedMarks(["B", "P", "B", "P", "B"], "cockroach"), ["red"]);
assert.deepEqual(derivedMarks(["B", "B", "P", "B", "P", "B"], "cockroach"), ["blue"]);

/* Layout reuses the big-road column builder: red = B column, blue = P column */
{
  const road = buildDerivedRoad(["B", "B", "P", "P", "P", "P"], "bigEye", 10, 6);
  assert.equal(road.columns.length, 3);
  assert.deepEqual(
    road.columns.map((c) => c.outcome),
    ["B", "P", "B"],
    "red, blue, red become three single-cell columns",
  );
  assert.equal(road.leadingTie, null);
}

/* Ask road */
{
  const ask = askRoad(["B", "B", "P"], "P");
  assert.equal(ask.bigEye, "red");
  assert.equal(ask.smallRoad, null, "small road has not started");
  assert.equal(ask.cockroach, null);
  const askB = askRoad(["B", "B", "P"], "B");
  assert.equal(askB.bigEye, "blue");
}
{
  const ask = askRoad([], "B");
  assert.deepEqual(ask, { bigEye: null, smallRoad: null, cockroach: null });
}

/* Bead plate */
{
  const plate = buildBeadPlate(["B", "P", "T", "B", "B", "B", "P"], 10, 6);
  assert.equal(plate.length, 2);
  assert.deepEqual(
    plate[0].map((c) => c?.side),
    ["B", "P", "T", "B", "B", "B"],
    "column-major, ties keep their own cell",
  );
  assert.deepEqual(plate[1].map((c) => c?.side ?? null), ["P", null, null, null, null, null]);
}
{
  const plate = buildBeadPlate(["B", "P", "T", "B", "B", "B", "P"], 1, 6);
  assert.equal(plate.length, 1);
  assert.equal(plate[0][0]?.side, "P", "oldest columns fall off the left");
}

console.log("derived-roads: all assertions passed");
