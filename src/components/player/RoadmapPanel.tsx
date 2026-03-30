export default function RoadmapPanel() {
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

  const COLS = 36;
  const ROWS = 6;

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Big Road Grid */}
      <div
        className="rounded-[10px] p-2 flex-1 min-h-0 flex flex-col"
        style={{ backgroundColor: "#101828", border: "0.8px solid #364153" }}
      >
        <div className="font-semibold text-[12px] leading-4 text-[#d1d5dc] mb-1 shrink-0">
          Big Road
        </div>
        <div
          className="grid flex-1 min-h-0"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
            gap: "1px",
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
                className="flex items-center justify-center"
              >
                <div
                  className="rounded-[3px] flex items-center justify-center"
                  style={{
                    width: "85%",
                    aspectRatio: "1",
                    backgroundColor: result ? colorMap[result] : "rgba(30,41,57,0.3)",
                  }}
                >
                  {result && (
                    <span className="text-[6px] font-bold text-white leading-none">{result}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Score Counters */}
      <div className="grid grid-cols-3 gap-1 shrink-0">
        <div className="bg-[#155dfc] rounded-lg py-2 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-lg leading-none">0</span>
          <span className="text-[#dbeafe] text-[10px] mt-0.5">Player</span>
        </div>
        <div className="bg-[#00a63e] rounded-lg py-2 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-lg leading-none">0</span>
          <span className="text-[#dcfce7] text-[10px] mt-0.5">Tie</span>
        </div>
        <div className="bg-[#e7000b] rounded-lg py-2 flex flex-col items-center justify-center">
          <span className="text-white font-bold text-lg leading-none">0</span>
          <span className="text-[#ffe2e2] text-[10px] mt-0.5">Banker</span>
        </div>
      </div>

      {/* Next Prediction */}
      <div
        className="rounded-[10px] p-2 shrink-0"
        style={{ backgroundColor: "#101828", border: "0.8px solid #364153" }}
      >
        <div className="font-semibold text-[11px] text-[#d1d5dc] mb-1">
          Next Prediction
        </div>
        <div className="flex items-center justify-center gap-3">
          {[
            { label: "P", bg: "#2b7fff", border: "#51a2ff" },
            { label: "T", bg: "#00c950", border: "#05df72" },
            { label: "B", bg: "#fb2c36", border: "#ff6467" },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-1">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ backgroundColor: p.bg, border: `1.6px solid ${p.border}` }}
              >
                <span className="text-white font-bold text-[10px]">{p.label}</span>
              </div>
              <span className="text-[#99a1af] text-xs">0%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
