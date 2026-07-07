/** Skeleton — a shimmering placeholder block (Pattern B perceived-perf).
 *
 * Server-safe (no "use client"); rendered inside loading.tsx suspense
 * fallbacks so navigation shows an instant shape instead of a blank wait.
 */

export default function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md ${className}`}
      style={{ backgroundColor: "rgba(255,255,255,0.08)", ...style }}
    />
  );
}
