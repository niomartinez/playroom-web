"use client";

const BETS = [
  { name: "PLAYER", gradient: "linear-gradient(154deg, rgb(0,101,255) 0%, rgb(0,21,86) 100%)", border: "rgba(43,127,255,0.5)", bets: 632, total: "$677,032", pct: 49 },
  { name: "TIE", gradient: "linear-gradient(154deg, rgb(58,161,40) 0%, rgb(0,86,16) 100%)", border: "rgba(0,201,80,0.5)", bets: 632, total: "$51,623", pct: 4 },
  { name: "BANKER", gradient: "linear-gradient(154deg, rgb(217,62,64) 0%, rgb(86,0,9) 100%)", border: "rgba(251,44,54,0.5)", bets: 632, total: "$646,509", pct: 47 },
];

export default function MainBets() {
  return (
    <div className="grid grid-cols-3 flex-1 min-h-0" style={{ gap: "0.4vw" }}>
      {BETS.map((bet) => (
        <button
          key={bet.name}
          className="relative text-left transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer overflow-hidden h-full"
          style={{ border: `1.6px solid ${bet.border}`, borderRadius: "0.7vw", padding: "0.6vh 0.8vw" }}
        >
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ borderRadius: "0.7vw" }}>
            <div className="absolute inset-0" style={{ backgroundImage: bet.gradient, borderRadius: "0.7vw" }} />
            <img alt="" className="absolute inset-0 w-full h-full object-cover" style={{ mixBlendMode: "color-burn", borderRadius: "0.7vw" }} src="/texture.png" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="font-bold text-white text-center" style={{ fontSize: "clamp(12px, 1.6vh, 24px)" }}>{bet.name}</div>
            <div>
              <div className="flex items-center justify-between text-white" style={{ fontSize: "clamp(8px, 1vh, 14px)" }}>
                <span className="font-medium">{bet.bets}</span>
                <span className="font-semibold">{bet.total}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full overflow-hidden" style={{ height: "0.5vh", marginTop: "0.2vh" }}>
                <div className="h-full bg-white rounded-full" style={{ width: `${bet.pct}%` }} />
              </div>
              <div className="text-right text-white/80" style={{ fontSize: "clamp(7px, 0.8vh, 12px)" }}>{bet.pct}%</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
