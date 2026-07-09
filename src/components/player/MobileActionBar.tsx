"use client";

import { useT } from "@/lib/i18n";

export default function MobileActionBar({
  onChatPress,
  chatEnabled = true,
}: {
  onChatPress?: () => void;
  chatEnabled?: boolean;
}) {
  const t = useT();
  if (!chatEnabled) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        padding: "8px 19px",
        minHeight: 55,
      }}
    >
      <button
        onClick={onChatPress}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "#101828",
          border: "1px solid #364153",
          borderRadius: 9999,
          padding: "8px 20px",
          minHeight: 44,
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>&#128172;</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "#FFFFFF",
            lineHeight: 1,
          }}
        >
          {t("chat.title")}
        </span>
      </button>
    </div>
  );
}
