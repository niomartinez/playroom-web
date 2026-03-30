"use client";

const BETS = [
  {
    name: "PLAYER",
    gradient: "linear-gradient(to bottom, rgb(0,101,255), rgb(0,21,86))",
    border: "rgba(43,127,255,0.5)",
    bets: 632,
    total: "$677,032",
    pct: 49,
    barColor: "#2b7fff",
  },
  {
    name: "TIE",
    gradient: "linear-gradient(to bottom, rgb(58,161,40), rgb(0,86,16))",
    border: "rgba(0,201,80,0.5)",
    bets: 632,
    total: "$51,623",
    pct: 4,
    barColor: "#00c950",
  },
  {
    name: "BANKER",
    gradient: "linear-gradient(to bottom, rgb(217,62,64), rgb(86,0,9))",
    border: "rgba(251,44,54,0.5)",
    bets: 632,
    total: "$646,509",
    pct: 47,
    barColor: "#fb2c36",
  },
];

export default function MainBets() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {BETS.map((bet) => (
        <button
          key={bet.name}
          className="relative rounded-[14px] px-5 py-5 text-left transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer overflow-hidden"
          style={{
            background: bet.gradient,
            border: `1px solid ${bet.border}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          {/* Texture overlay */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)",
              mixBlendMode: "color-burn",
            }}
          />

          <div className="relative z-10">
            <div className="text-xl font-bold text-white mb-3">{bet.name}</div>

            {/* Stats */}
            <div className="flex items-center gap-2 text-xs text-white/70 mb-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
              <span>{bet.bets} bets</span>
              <span className="ml-auto font-semibold text-white">{bet.total}</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${bet.pct}%`,
                  backgroundColor: bet.barColor,
                }}
              />
            </div>
            <div className="text-right text-xs text-white/60 mt-1">{bet.pct}%</div>
          </div>
        </button>
      ))}
    </div>
  );
}
