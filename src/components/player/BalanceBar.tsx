const CHIPS = [
  { color: "#e7000b", label: "10" },
  { color: "#2b7fff", label: "25" },
  { color: "#00a63e", label: "50" },
  { color: "#8b5cf6", label: "100" },
  { color: "#f97316", label: "500" },
  { color: "#f0b100", label: "1000" },
];

export default function BalanceBar() {
  return (
    <div
      className="flex items-center justify-between h-full"
      style={{
        backgroundColor: "#101828",
        border: "0.8px solid #364153",
        borderRadius: "0.7vw",
        padding: "0 1vw",
      }}
    >
      <div className="flex items-center" style={{ gap: "0.5vw" }}>
        <svg className="text-[#99a1af] flex-shrink-0" style={{ width: "1.6vh", height: "1.6vh" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z" />
          <path d="M16 12a1 1 0 102 0 1 1 0 00-2 0z" />
        </svg>
        <div>
          <div className="text-[#99a1af]" style={{ fontSize: "clamp(8px, 0.9vh, 12px)" }}>Balance</div>
          <div className="font-bold text-white" style={{ fontSize: "clamp(12px, 1.4vh, 20px)" }}>$10,000</div>
        </div>
      </div>

      {/* Chip icons */}
      <div className="flex items-center" style={{ gap: "0.3vw" }}>
        {CHIPS.map((chip) => (
          <div
            key={chip.label}
            className="rounded-full flex items-center justify-center font-bold text-white shadow-md"
            style={{
              width: "clamp(20px, 2.2vh, 36px)",
              height: "clamp(20px, 2.2vh, 36px)",
              backgroundColor: chip.color,
              fontSize: "clamp(6px, 0.7vh, 10px)",
              border: "2px solid rgba(255,255,255,0.3)",
            }}
          >
            {chip.label}
          </div>
        ))}
      </div>
    </div>
  );
}
