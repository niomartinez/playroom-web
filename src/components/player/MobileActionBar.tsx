"use client";

export default function MobileActionBar({
  onTipPress,
  onChatPress,
  chatEnabled = true,
}: {
  onTipPress?: () => void;
  onChatPress?: () => void;
  chatEnabled?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: chatEnabled ? "space-between" : "flex-start",
        padding: "8px 19px",
        minHeight: 55,
      }}
    >
      {/* Tip button */}
      <button
        onClick={onTipPress}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "linear-gradient(135deg, #E7000B, #9F0712)",
          border: "none",
          borderRadius: 9999,
          padding: "8px 20px",
          minHeight: 44,
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>&#10084;</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#FFFFFF",
            lineHeight: 1,
          }}
        >
          SEND
        </span>
      </button>

      {/* Live Chat button — gated by feature flag */}
      {chatEnabled && (
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
            Live Chat
          </span>
        </button>
      )}
    </div>
  );
}
