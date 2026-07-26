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
      className={`rounded-xl p-5 flex flex-col gap-2 text-left w-full ${
        onClick ? "cursor-pointer transition-colors hover:bg-white/[0.04]" : ""
      }`}
      style={{
        backgroundColor: "#171717",
        border: "1px solid rgba(208,135,0,0.2)",
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "#d08700" }}
        >
          {label}
        </span>
        {icon && (
          <span style={{ color: "#6a7282" }}>{icon}</span>
        )}
      </div>

      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold" style={{ color: color || "#ffffff" }}>{value}</span>
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
