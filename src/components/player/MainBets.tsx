"use client";

const BETS = [
  {
    name: "PLAYER",
    gradient: "linear-gradient(154deg, rgb(0,101,255) 0%, rgb(0,21,86) 100%)",
    border: "rgba(43,127,255,0.5)",
    bets: 632,
    total: "$677,032",
    pct: 49,
  },
  {
    name: "TIE",
    gradient: "linear-gradient(154deg, rgb(58,161,40) 0%, rgb(0,86,16) 100%)",
    border: "rgba(0,201,80,0.5)",
    bets: 632,
    total: "$51,623",
    pct: 4,
  },
  {
    name: "BANKER",
    gradient: "linear-gradient(154deg, rgb(217,62,64) 0%, rgb(86,0,9) 100%)",
    border: "rgba(251,44,54,0.5)",
    bets: 632,
    total: "$646,509",
    pct: 47,
  },
];

export default function MainBets() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {BETS.map((bet) => (
        <button
          key={bet.name}
          className="relative rounded-[14px] px-6 py-5 text-left transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer overflow-hidden"
          style={{
            border: `1.6px solid ${bet.border}`,
            boxShadow: "0px 20px 25px rgba(0,0,0,0.1), 0px 8px 10px rgba(0,0,0,0.1)",
          }}
        >
          {/* Gradient + texture overlay */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none rounded-[14px]">
            <div
              className="absolute inset-0 rounded-[14px]"
              style={{ backgroundImage: bet.gradient }}
            />
            <img
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-[14px]"
              style={{ mixBlendMode: "color-burn" }}
              src="/texture.png"
            />
          </div>

          <div className="relative z-10">
            <div className="text-2xl font-bold text-white text-center mb-3">{bet.name}</div>

            <div className="flex items-center justify-between text-sm text-white mb-1">
              <span className="font-medium">{bet.bets}</span>
              <span className="font-semibold">{bet.total}</span>
            </div>

            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: `${bet.pct}%` }}
              />
            </div>
            <div className="text-right text-xs text-white/80 mt-1">{bet.pct}%</div>
          </div>
        </button>
      ))}
    </div>
  );
}
