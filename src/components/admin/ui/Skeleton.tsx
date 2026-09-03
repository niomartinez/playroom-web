"use client";

/**
 * A placeholder bar for a value that is not known yet.
 *
 * Used INSTEAD of showing the previous value while a new one loads. Dimming the
 * old figure was tried first and is wrong for this panel: a dimmed number is
 * still a number, and someone reading "GGR ₱8,545,100" after picking a
 * different date range has no reason to doubt it — they can screenshot a figure
 * that answers a question they did not ask. A skeleton cannot be misread as
 * data.
 *
 * Only the VALUES are skeletoned, never the surrounding chrome. Labels, tiles,
 * tabs, the date presets and the table's own structure all stay mounted and
 * live, because unmounting the controls is what made this page feel broken in
 * the first place: a control that is not in the DOM cannot receive the click
 * you just aimed at it.
 */
export default function Skeleton({
  width = "100%",
  height = 14,
  className = "",
}: {
  width?: number | string;
  height?: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={className}
      style={{
        display: "inline-block",
        width,
        height,
        borderRadius: 4,
        verticalAlign: "middle",
        // Two golds rather than a grey, so it reads as "this panel is working"
        // and stays consistent with the rest of the admin palette.
        background:
          "linear-gradient(90deg, rgba(208,135,0,0.10) 25%, rgba(240,177,0,0.22) 37%, rgba(208,135,0,0.10) 63%)",
        backgroundSize: "400% 100%",
        animation: "prg-shimmer 1.2s ease-in-out infinite",
      }}
    />
  );
}

/**
 * Keyframes for the shimmer. Mounted once by a page that uses skeletons —
 * inline rather than in globals.css so the animation ships with the component
 * that needs it and cannot be dropped from the stylesheet independently.
 */
export function SkeletonKeyframes() {
  return (
    <style>
      {"@keyframes prg-shimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}"}
    </style>
  );
}
