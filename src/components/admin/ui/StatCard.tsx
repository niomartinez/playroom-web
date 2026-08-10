"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: string;
  /**
   * Makes the card a button. Use when the number has a drill-down — a count on
   * its own tells an operator that something happened but not what, so wherever
   * the detail exists the card should be the way in.
   */
  onClick?: () => void;
  /** Shown under the value, e.g. "Click to see the failures". */
  hint?: string;
}

const TREND_COLORS: Record<string, string> = {
  up: "#05df72",
  down: "#fb2c36",
  neutral: "#6a7282",
};

export default function StatCard({ label, value, icon, trend, color, onClick, hint }: StatCardProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`rounded-xl p-5 max-md:p-4 flex flex-col gap-2 text-left w-full min-w-0 overflow-hidden ${
        onClick ? "cursor-pointer transition-colors hover:bg-white/[0.04]" : ""
      }`}
      style={{
        backgroundColor: "#171717",
        border: "1px solid rgba(208,135,0,0.2)",
        // Inline rather than an arbitrary Tailwind class on purpose. The value
        // below sizes itself in `cqi`, which resolves against the nearest
        // container — and if this declaration were ever dropped from the
        // stylesheet, `cqi` would fall back to the VIEWPORT and the number
        // would render enormous instead of merely overflowing. Failing that
        // way round is much worse, so this one does not go through the build.
        containerType: "inline-size",
      }}
    >
      <div className="flex items-center justify-between max-md:gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-wider max-md:min-w-0"
          style={{ color: "#d08700" }}
        >
          {label}
        </span>
        {icon && (
          <span className="max-md:shrink-0" style={{ color: "#6a7282" }}>{icon}</span>
        )}
      </div>

      {/* The value scales to the CARD, not the viewport.

          A fixed text-3xl only fits until the number is long: six cards across a
          reports row leaves each one ~200px, and "228,500.00" at 30px needs more
          than that, so it simply ran past the border. Shrinking only below md
          did not help — the overflow happens on a wide desktop, where the
          columns are narrow because there are many of them, not because the
          screen is small.

          `cqi` is a percentage of this card's own inline size, so the number
          fits whether the card is one of three or one of six. The clamp floor
          keeps it readable and the ceiling keeps a short value (e.g. "194")
          from ballooning. */}
      <div className="flex items-end gap-2 min-w-0">
        <span
          className="font-bold tabular-nums min-w-0 leading-tight [overflow-wrap:anywhere]"
          style={{
            color: color || "#ffffff",
            // Measured, not guessed. `cqi` resolves against the card's CONTENT
            // box, so at six-across on a 1512px screen (191px of content) this
            // lands at ~20.8px and an eight-figure peso total still leaves 39px
            // of slack; at 1280px it drops to the 16px floor and still fits.
            // On a 375px phone the same absurd value wraps to two lines rather
            // than spilling — which is the right way to run out of room.
            fontSize: "clamp(1rem, 11cqi, 1.875rem)",
          }}
        >
          {value}
        </span>
        {trend && (
          <span
            className="text-xs font-medium mb-1"
            style={{ color: TREND_COLORS[trend] }}
          >
            {trend === "up" && "\u25B2"}
            {trend === "down" && "\u25BC"}
            {trend === "neutral" && "\u25CF"}
          </span>
        )}
      </div>

      {hint && (
        <span className="text-[11px]" style={{ color: "#6a7282" }}>
          {hint}
        </span>
      )}
    </Tag>
  );
}
