/**
 * Shown when someone opens /pitch without a valid, unexpired link token.
 * Deliberately plain and un-branded-with-content — no deck, no screenshots —
 * so an expired or leaked URL reveals nothing.
 */
export default function LinkGate() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#e5e7eb",
        padding: 24,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 420 }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, letterSpacing: 0.4 }}>
          This link isn&rsquo;t active
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#9aa4b2" }}>
          Pitch links are private and expire. Please contact your Playroom
          Gaming representative for a current link.
        </p>
        <p style={{ fontSize: 12, marginTop: 20, color: "#4b5563" }}>18+ / 21+ where required</p>
      </div>
    </div>
  );
}
