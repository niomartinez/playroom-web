"use client";

type BadgeStatus = "active" | "inactive" | "error" | "pending";

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
}

const STATUS_STYLES: Record<
  BadgeStatus,
  { bg: string; text: string; dot: string; defaultLabel: string }
> = {
  active: {
    bg: "rgba(5,223,114,0.12)",
    text: "#05df72",
    dot: "#05df72",
    defaultLabel: "Active",
  },
  inactive: {
    bg: "rgba(251,44,54,0.12)",
    text: "#fb2c36",
    dot: "#fb2c36",
    defaultLabel: "Inactive",
  },
  error: {
    bg: "rgba(251,44,54,0.12)",
    text: "#fb2c36",
    dot: "#fb2c36",
    defaultLabel: "Error",
  },
  pending: {
    bg: "rgba(240,177,0,0.12)",
    text: "#f0b100",
    dot: "#f0b100",
    defaultLabel: "Pending",
  },
};

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.inactive;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 6, height: 6, backgroundColor: s.dot }}
      />
      {label || s.defaultLabel}
    </span>
  );
}
