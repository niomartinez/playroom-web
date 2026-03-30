export default function RoadmapPanel() {
  // Mock bead road data: P=player, B=banker, T=tie
  const beadRoad = [
    "B", "P", "B", "B", "P", "B",
    "P", "P", "B", "P", "T", "B",
    "B", "P", "P", "B", "B", "P",
    "P", "B", "B", "P", "B", "P",
    "B", "P", "P", "B", "P", "B",
  ];

  const colorMap: Record<string, string> = {
    P: "#2b7fff",
    B: "#fb2c36",
    T: "#00c950",
  };

  // Generate 36x6 grid cells, fill with bead road data column-first
  const COLS = 36;
  const ROWS = 6;

  return (
    <div className="flex flex-col gap-[16px] h-full">
      {/* Big Road Grid */}
      <div
        className="rounded-[10px] pt-[5px] px-[12.8px] pb-[12.8px]"
        style={{
          backgroundColor: "#101828",
          border: "0.8px solid #364153",
        }}
      >
        <div className="font-semibold text-[14px] leading-[20px] text-[#d1d5dc] mb-[6px]">
          Big Road
        </div>
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 14.025px)`,
            gridTemplateRows: `repeat(${ROWS}, 14.025px)`,
            gap: "2px",
          }}
        >
          {Array.from({ length: ROWS * COLS }).map((_, idx) => {
            const col = Math.floor(idx / ROWS);
            const row = idx % ROWS;
            const dataIndex = col * ROWS + row;
            const result = beadRoad[dataIndex];
            return (
              <div
                key={idx}
                className="rounded-[6px] flex items-center justify-center"
                style={{
                  width: "14.025px",
                  height: "14.025px",
                  backgroundColor: result
                    ? colorMap[result]
                    : "rgba(30,41,57,0.3)",
                }}
              >
                {result && (
                  <span className="text-[7px] font-bold text-white leading-none">
                    {result}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Score Counters */}
      <div className="grid grid-cols-3 gap-[8px]">
        {/* Player */}
        <div className="bg-[#155dfc] rounded-[10px] h-[72px] flex flex-col items-center justify-center">
          <span className="text-white font-bold text-[24px] leading-none">0</span>
          <span className="text-[#dbeafe] text-[12px] mt-[4px]">Player</span>
        </div>
        {/* Tie */}
        <div className="bg-[#00a63e] rounded-[10px] h-[72px] flex flex-col items-center justify-center">
          <span className="text-white font-bold text-[24px] leading-none">0</span>
          <span className="text-[#dcfce7] text-[12px] mt-[4px]">Tie</span>
        </div>
        {/* Banker */}
        <div className="bg-[#e7000b] rounded-[10px] h-[72px] flex flex-col items-center justify-center">
          <span className="text-white font-bold text-[24px] leading-none">0</span>
          <span className="text-[#ffe2e2] text-[12px] mt-[4px]">Banker</span>
        </div>
      </div>

      {/* Next Prediction */}
      <div
        className="rounded-[10px] pt-[12.8px] px-[12.8px] pb-[12.8px]"
        style={{
          backgroundColor: "#101828",
          border: "0.8px solid #364153",
        }}
      >
        <div className="font-semibold text-[14px] leading-[20px] text-[#d1d5dc] mb-[12px]">
          Next Prediction
        </div>
        <div className="flex items-center justify-center gap-[16px]">
          {/* P circle + pct */}
          <div className="flex items-center gap-[8px]">
            <div
              className="w-[40px] h-[40px] rounded-full bg-[#2b7fff] flex items-center justify-center"
              style={{ border: "1.6px solid #51a2ff" }}
            >
              <span className="text-white font-bold text-[14px]">P</span>
            </div>
            <span className="text-[#99a1af] text-[24px]">0%</span>
          </div>
          {/* T circle + pct */}
          <div className="flex items-center gap-[8px]">
            <div
              className="w-[40px] h-[40px] rounded-full bg-[#00c950] flex items-center justify-center"
              style={{ border: "1.6px solid #05df72" }}
            >
              <span className="text-white font-bold text-[14px]">T</span>
            </div>
            <span className="text-[#99a1af] text-[24px]">0%</span>
          </div>
          {/* B circle + pct */}
          <div className="flex items-center gap-[8px]">
            <div
              className="w-[40px] h-[40px] rounded-full bg-[#fb2c36] flex items-center justify-center"
              style={{ border: "1.6px solid #ff6467" }}
            >
              <span className="text-white font-bold text-[14px]">B</span>
            </div>
            <span className="text-[#99a1af] text-[24px]">0%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
