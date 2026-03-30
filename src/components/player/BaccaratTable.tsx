export default function BaccaratTable() {
  return (
    <div
      className="relative overflow-hidden h-full flex items-stretch"
      style={{
        border: "4px solid rgba(208,135,0,0.4)",
        boxShadow: "0px 25px 50px -12px rgba(0,0,0,0.25)",
        borderRadius: "1.5vw",
        gap: "1vw",
        padding: "1.2vw",
      }}
    >
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{ borderRadius: "1.5vw" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(192deg, rgb(57,164,57) 29%, rgb(10,48,9) 80%)", borderRadius: "1.5vw" }} />
        <img alt="" className="absolute inset-0 w-full h-full object-cover" style={{ mixBlendMode: "color-burn", borderRadius: "1.5vw" }} src="/texture.png" />
      </div>

      {/* Player side */}
      <div className="relative z-10 flex-1 flex flex-col" style={{ background: "rgba(21,93,252,0.2)", border: "1.6px solid rgba(43,127,255,0.5)", borderRadius: "1vw", padding: "1vh 1vw" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: "0.5vw" }}>
            <div className="rounded-full bg-[#2b7fff] border-2 border-white flex items-center justify-center shadow-lg" style={{ width: "3.5vh", height: "3.5vh" }}>
              <span className="text-white font-bold" style={{ fontSize: "1.5vh" }}>P</span>
            </div>
            <span className="font-bold text-white" style={{ fontSize: "1.8vh" }}>PLAYER</span>
          </div>
          <div className="bg-[#2b7fff] shadow-lg flex items-center justify-center" style={{ borderRadius: "0.8vw", padding: "0.2vh 0.6vw" }}>
            <span className="text-white font-bold" style={{ fontSize: "2.5vh" }}>0</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-white/50" style={{ fontSize: "1.2vh" }}>Waiting for bets...</span>
        </div>
      </div>

      {/* Banker side */}
      <div className="relative z-10 flex-1 flex flex-col" style={{ background: "rgba(231,0,11,0.2)", border: "1.6px solid rgba(251,44,54,0.5)", borderRadius: "1vw", padding: "1vh 1vw" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center" style={{ gap: "0.5vw" }}>
            <div className="rounded-full bg-[#fb2c36] border-2 border-white flex items-center justify-center shadow-lg" style={{ width: "3.5vh", height: "3.5vh" }}>
              <span className="text-white font-bold" style={{ fontSize: "1.5vh" }}>B</span>
            </div>
            <span className="font-bold text-white" style={{ fontSize: "1.8vh" }}>BANKER</span>
          </div>
          <div className="bg-[#fb2c36] shadow-lg flex items-center justify-center" style={{ borderRadius: "0.8vw", padding: "0.2vh 0.6vw" }}>
            <span className="text-white font-bold" style={{ fontSize: "2.5vh" }}>0</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-white/50" style={{ fontSize: "1.2vh" }}>Waiting for bets...</span>
        </div>
      </div>
    </div>
  );
}
