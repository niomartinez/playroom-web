export default function StudioHeader() {
  const zones = [
    { label: "Main", subtitle: null },
    { label: "Pair / Tie", subtitle: null },
    { label: "Lucky 6", subtitle: null },
    { label: "Dragon 7 / Panda", subtitle: null },
  ];

  return (
    <header
      className="flex items-center justify-between px-6 h-[62px] shrink-0"
      style={{
        background: "linear-gradient(to right, #000000, #171717, #000000)",
        borderBottom: "1px solid rgba(208,135,0,0.3)",
      }}
    >
      {/* Logo */}
      <span
        className="text-lg font-bold tracking-wide"
        style={{ color: "#d08700" }}
      >
        Play Room Gaming
      </span>

      {/* Betting Zones */}
      <div className="flex items-center gap-6">
        {zones.map((zone) => (
          <div
            key={zone.label}
            className="flex flex-col items-center text-center"
          >
            <span className="text-[11px] font-medium text-white/70">
              {zone.label}
            </span>
            <span className="text-[10px] font-normal" style={{ color: "#6a7282" }}>
              MIN:$20&nbsp;&nbsp;MAX:$50,000
            </span>
          </div>
        ))}
      </div>

      {/* Settings Gear */}
      <button
        className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-white/5 transition-colors"
        aria-label="Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#99a1af"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </header>
  );
}
