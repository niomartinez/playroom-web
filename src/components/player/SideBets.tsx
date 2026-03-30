const SIDE_BETS = [
  {
    name: "PERFECT PAIR",
    odds: "25:1",
    gradient: "linear-gradient(to bottom, rgb(208,135,0), rgb(137,75,0))",
    border: "rgba(208,135,0,0.5)",
  },
  {
    name: "EITHER PAIR",
    odds: "5:1",
    gradient: "linear-gradient(to bottom, rgb(208,135,0), rgb(137,75,0))",
    border: "rgba(208,135,0,0.5)",
  },
  {
    name: "PLAYER PAIR",
    odds: "11:1",
    gradient: "linear-gradient(to bottom, rgb(21,93,252), rgb(25,60,184))",
    border: "rgba(43,127,255,0.5)",
  },
  {
    name: "BANKER PAIR",
    odds: "11:1",
    gradient: "linear-gradient(to bottom, rgb(231,0,11), rgb(159,7,18))",
    border: "rgba(251,44,54,0.5)",
  },
];

export default function SideBets() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {SIDE_BETS.map((bet) => (
        <button
          key={bet.name}
          className="rounded-[14px] px-4 py-3 text-center transition-all hover:brightness-110 active:scale-95 cursor-pointer"
          style={{
            background: bet.gradient,
            border: `1px solid ${bet.border}`,
            boxShadow: `0 4px 12px rgba(0,0,0,0.3)`,
          }}
        >
          <div className="text-base font-bold text-white leading-tight">
            {bet.name}
          </div>
          <div className="text-sm font-medium text-white/80 mt-0.5">
            {bet.odds}
          </div>
        </button>
      ))}
    </div>
  );
}
