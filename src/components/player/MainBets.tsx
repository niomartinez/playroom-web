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
    <div className="grid grid-cols-3 h-full" style={{ gap: "0.6vw" }}>
      {BETS.map((bet) => (
        <button
          key={bet.name}
          className="relative rounded-[0.8vw] text-left transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer overflow-hidden h-full"
          style={{
            border: `1.6px solid ${bet.border}`,
            boxShadow: "0px 20px 25px rgba(0,0,0,0.1), 0px 8px 10px rgba(0,0,0,0.1)",
            padding: "1vh 1vw",
          }}
        >
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ borderRadius: "0.8vw" }}>
            <div className="absolute inset-0" style={{ backgroundImage: bet.gradient, borderRadius: "0.8vw" }} />
            <img alt="" className="absolute inset-0 w-full h-full object-cover" style={{ mixBlendMode: "color-burn", borderRadius: "0.8vw" }} src="/texture.png" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="font-bold text-white text-center" style={{ fontSize: "2vh" }}>{bet.name}</div>
            <div>
              <div className="flex items-center justify-between text-white" style={{ fontSize: "1.2vh" }}>
                <span className="font-medium">{bet.bets}</span>
                <span className="font-semibold">{bet.total}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full overflow-hidden" style={{ height: "0.6vh", marginTop: "0.3vh" }}>
                <div className="h-full bg-white rounded-full" style={{ width: `${bet.pct}%` }} />
              </div>
              <div className="text-right text-white/80" style={{ fontSize: "1vh", marginTop: "0.2vh" }}>{bet.pct}%</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
