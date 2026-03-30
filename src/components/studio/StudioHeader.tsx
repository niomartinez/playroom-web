export default function StudioHeader() {
  return (
    <header
      className="relative shrink-0"
      style={{
        height: 62,
        background: "linear-gradient(to right, #000000 0%, #171717 50%, #000000 100%)",
        borderBottom: "1px solid rgba(208,135,0,0.3)",
        boxShadow: "0px 10px 15px rgba(208,135,0,0.2), 0px 4px 6px rgba(208,135,0,0.2)",
      }}
    >
      {/* Logo — positioned over left side */}
      <div className="absolute left-6 top-0 flex items-center h-full">
        <span
          className="font-bold text-lg tracking-wide"
          style={{ color: "#f0b100" }}
        >
          Play Room Gaming
        </span>
      </div>

      {/* Betting zone labels — centered */}
      <div className="flex items-center justify-center h-full gap-16">
        {/* Zone 1: Main */}
        <div className="flex items-center gap-8">
          <span className="font-semibold" style={{ color: "#f0b100", fontSize: 14 }}>
            MIN:<span className="text-white">$20</span>
          </span>
          <span className="font-semibold" style={{ color: "#f0b100", fontSize: 14 }}>
            MAX:<span className="text-white">$50,000</span>
          </span>
        </div>

        {/* Zone 2: Pair / Tie */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-8">
            <span className="font-semibold" style={{ color: "#f0b100", fontSize: 14 }}>
              MIN:<span className="text-white">$20</span>
            </span>
            <span className="font-semibold" style={{ color: "#f0b100", fontSize: 14 }}>
              MAX:<span className="text-white">$50,000</span>
            </span>
          </div>
          <span className="font-normal" style={{ color: "#6a7282", fontSize: 12 }}>
            Pair / Tie
          </span>
        </div>

        {/* Zone 3: Lucky 6 */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-8">
            <span className="font-semibold" style={{ color: "#f0b100", fontSize: 14 }}>
              MIN:<span className="text-white">$20</span>
            </span>
            <span className="font-semibold" style={{ color: "#f0b100", fontSize: 14 }}>
              MAX:<span className="text-white">$50,000</span>
            </span>
          </div>
          <span className="font-normal" style={{ color: "#6a7282", fontSize: 12 }}>
            Lucky 6
          </span>
        </div>

        {/* Zone 4: Dragon 7 / Panda */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-8">
            <span className="font-semibold" style={{ color: "#f0b100", fontSize: 14 }}>
              MIN:<span className="text-white">$20</span>
            </span>
            <span className="font-semibold" style={{ color: "#f0b100", fontSize: 14 }}>
              MAX:<span className="text-white">$50,000</span>
            </span>
          </div>
          <span className="font-normal" style={{ color: "#6a7282", fontSize: 12 }}>
            Dragon 7 / Panda
          </span>
        </div>
      </div>

      {/* Settings gear — right side */}
      <button
        className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center justify-center"
        style={{ width: 24, height: 24 }}
        aria-label="Settings"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#99a1af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </header>
  );
}
