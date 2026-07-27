"use client";

/**
 * "Refreshing…" — the quiet counterpart to a loading skeleton.
 *
 * The whole point of the query cache is that revisiting a page repaints
 * instantly from cache and refreshes underneath. That refresh still needs to be
 * visible, or the operator cannot tell stale data from current data — but it
 * must NOT be a blocking spinner, because there is already a full table on
 * screen that they may well be reading.
 *
 * Render it only when `refreshing && !loading`: during a genuine first load the
 * table's own skeleton is the right signal and this would be a second, competing
 * one.
 */
export default function RefreshingHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      className="text-xs flex items-center gap-2"
      style={{ color: "#6a7282" }}
      role="status"
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          border: "2px solid rgba(240,177,0,0.35)",
          borderTopColor: "#f0b100",
          display: "inline-block",
          animation: "prg-spin 0.7s linear infinite",
        }}
      />
      Refreshing…
      <style>{"@keyframes prg-spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
