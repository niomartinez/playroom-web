const SIDE_BETS = [
  { name: "PERFECT PAIR", odds: "25:1", gradient: "linear-gradient(162deg, rgb(208,135,0) 0%, rgb(137,75,0) 100%)", border: "rgba(208,135,0,0.5)" },
  { name: "EITHER PAIR", odds: "5:1", gradient: "linear-gradient(162deg, rgb(208,135,0) 0%, rgb(137,75,0) 100%)", border: "rgba(208,135,0,0.5)" },
  { name: "PLAYER PAIR", odds: "11:1", gradient: "linear-gradient(162deg, rgb(21,93,252) 0%, rgb(25,60,184) 100%)", border: "rgba(43,127,255,0.5)" },
  { name: "BANKER PAIR", odds: "11:1", gradient: "linear-gradient(162deg, rgb(231,0,11) 0%, rgb(159,7,18) 100%)", border: "rgba(251,44,54,0.5)" },
];

export default function SideBets() {
  return (
    <div className="grid grid-cols-4" style={{ gap: "0.4vw" }}>
      {SIDE_BETS.map((bet) => (
        <button
          key={bet.name}
          className="relative text-center transition-all hover:brightness-110 active:scale-95 cursor-pointer overflow-hidden flex items-center justify-center"
          style={{ border: `1.6px solid ${bet.border}`, borderRadius: "0.7vw", padding: "0.6vh 0.4vw" }}
        >
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ borderRadius: "0.7vw" }}>
            <div className="absolute inset-0" style={{ backgroundImage: bet.gradient, borderRadius: "0.7vw" }} />
            <img alt="" className="absolute inset-0 w-full h-full object-cover" style={{ mixBlendMode: "color-burn", borderRadius: "0.7vw" }} src="/texture.png" />
          </div>
          <div className="relative z-10">
            <div className="font-bold text-white leading-tight" style={{ fontSize: "clamp(9px, 1.1vh, 16px)" }}>{bet.name}</div>
            <div className="font-medium text-white/90" style={{ fontSize: "clamp(8px, 0.9vh, 14px)" }}>{bet.odds}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
