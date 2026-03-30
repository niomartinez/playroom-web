export default function BaccaratTable() {
  return (
    <div
      className="relative rounded-[24px] p-8 flex items-stretch gap-8 overflow-hidden h-full"
      style={{
        border: "4px solid rgba(208,135,0,0.4)",
        boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)",
      }}
    >
      {/* Gradient + texture overlay */}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none rounded-[24px]">
        <div
          className="absolute inset-0 rounded-[24px]"
          style={{
            backgroundImage: "linear-gradient(192deg, rgb(57,164,57) 29%, rgb(10,48,9) 80%)",
          }}
        />
        <img
          alt=""
          className="absolute inset-0 w-full h-full object-cover rounded-[24px]"
          style={{ mixBlendMode: "color-burn" }}
          src="/texture.png"
        />
      </div>

      {/* Player side */}
      <div
        className="relative z-10 flex-1 rounded-[16px] p-5 flex flex-col gap-4"
        style={{
          background: "rgba(21,93,252,0.2)",
          border: "1.6px solid rgba(43,127,255,0.5)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[48px] h-[48px] rounded-full bg-[#2b7fff] border-2 border-white flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-[20px]">P</span>
            </div>
            <span className="text-2xl font-bold text-white">PLAYER</span>
          </div>
          <div className="bg-[#2b7fff] rounded-[14px] px-3 py-1 shadow-lg">
            <span className="text-white font-bold text-[36px]">0</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-white/50 text-base">Waiting for bets...</span>
        </div>
      </div>

      {/* Banker side */}
      <div
        className="relative z-10 flex-1 rounded-[16px] p-5 flex flex-col gap-4"
        style={{
          background: "rgba(231,0,11,0.2)",
          border: "1.6px solid rgba(251,44,54,0.5)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[48px] h-[48px] rounded-full bg-[#fb2c36] border-2 border-white flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-[20px]">B</span>
            </div>
            <span className="text-2xl font-bold text-white">BANKER</span>
          </div>
          <div className="bg-[#fb2c36] rounded-[14px] px-3 py-1 shadow-lg">
            <span className="text-white font-bold text-[36px]">0</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-white/50 text-base">Waiting for bets...</span>
        </div>
      </div>
    </div>
  );
}
