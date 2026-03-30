export default function BaccaratTable() {
  return (
    <div
      className="rounded-[24px] p-6 flex items-stretch gap-4"
      style={{
        background: "linear-gradient(to bottom, rgb(57,164,57), rgb(10,48,9))",
        border: "4px solid rgba(208,135,0,0.4)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
      }}
    >
      {/* Player side */}
      <div
        className="flex-1 rounded-2xl p-4 flex flex-col items-center justify-center gap-3"
        style={{
          background: "rgba(21,93,252,0.2)",
          border: "1px solid rgba(43,127,255,0.5)",
        }}
      >
        <div className="w-10 h-10 rounded-full bg-[#2b7fff] flex items-center justify-center text-white font-bold text-lg">
          P
        </div>
        <div className="text-sm font-semibold text-white">PLAYER</div>
        <div className="bg-[#2b7fff] rounded-[14px] px-4 py-1 text-white font-bold text-lg">
          0
        </div>
        <div className="text-xs text-white/60 mt-1">Waiting for bets...</div>
      </div>

      {/* VS divider */}
      <div className="flex items-center">
        <div className="text-[#d08700] font-bold text-sm opacity-60">VS</div>
      </div>

      {/* Banker side */}
      <div
        className="flex-1 rounded-2xl p-4 flex flex-col items-center justify-center gap-3"
        style={{
          background: "rgba(231,0,11,0.2)",
          border: "1px solid rgba(251,44,54,0.5)",
        }}
      >
        <div className="w-10 h-10 rounded-full bg-[#fb2c36] flex items-center justify-center text-white font-bold text-lg">
          B
        </div>
        <div className="text-sm font-semibold text-white">BANKER</div>
        <div className="bg-[#fb2c36] rounded-[14px] px-4 py-1 text-white font-bold text-lg">
          0
        </div>
        <div className="text-xs text-white/60 mt-1">Waiting for bets...</div>
      </div>
    </div>
  );
}
