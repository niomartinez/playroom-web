const SIDE_BETS = [
  {
    name: "PERFECT PAIR",
    odds: "25:1",
    gradient: "linear-gradient(162deg, rgb(208,135,0) 0%, rgb(137,75,0) 100%)",
    border: "rgba(208,135,0,0.5)",
  },
  {
    name: "EITHER PAIR",
    odds: "5:1",
    gradient: "linear-gradient(162deg, rgb(208,135,0) 0%, rgb(137,75,0) 100%)",
    border: "rgba(208,135,0,0.5)",
  },
  {
    name: "PLAYER PAIR",
    odds: "11:1",
    gradient: "linear-gradient(162deg, rgb(21,93,252) 0%, rgb(25,60,184) 100%)",
    border: "rgba(43,127,255,0.5)",
  },
  {
    name: "BANKER PAIR",
    odds: "11:1",
    gradient: "linear-gradient(162deg, rgb(231,0,11) 0%, rgb(159,7,18) 100%)",
    border: "rgba(251,44,54,0.5)",
  },
];

export default function SideBets() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {SIDE_BETS.map((bet) => (
        <button
          key={bet.name}
          className="relative rounded-[14px] px-4 py-4 text-center transition-all hover:brightness-110 active:scale-95 cursor-pointer overflow-hidden"
          style={{
            border: `1.6px solid ${bet.border}`,
            boxShadow: "0px 10px 15px rgba(0,0,0,0.1), 0px 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          {/* Gradient + texture */}
          <div aria-hidden="true" className="absolute inset-0 pointer-events-none rounded-[14px]">
            <div className="absolute inset-0 rounded-[14px]" style={{ backgroundImage: bet.gradient }} />
            <img
              alt=""
              className="absolute inset-0 w-full h-full object-cover rounded-[14px]"
              style={{ mixBlendMode: "color-burn" }}
              src="/texture.png"
            />
          </div>

          <div className="relative z-10">
            <div className="text-base font-bold text-white leading-tight">
              {bet.name}
            </div>
            <div className="text-sm font-medium text-white/90 mt-0.5">
              {bet.odds}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
