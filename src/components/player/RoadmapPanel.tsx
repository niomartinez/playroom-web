export default function RoadmapPanel() {
  const beadRoad = [
    "B","P","B","B","P","B",
    "P","P","B","P","T","B",
    "B","P","P","B","B","P",
    "P","B","B","P","B","P",
    "B","P","P","B","P","B",
  ];
  const colorMap: Record<string, string> = { P: "#2b7fff", B: "#fb2c36", T: "#00c950" };
  const COLS = 36;
  const ROWS = 6;

  return (
    <div className="flex flex-col h-full" style={{ gap: "0.4vh" }}>
      {/* Big Road Grid — takes most space */}
      <div
        className="flex-[3] min-h-0 flex flex-col overflow-hidden"
        style={{ backgroundColor: "#101828", border: "0.8px solid #364153", borderRadius: "0.6vw", padding: "0.4vh 0.6vw" }}
      >
        <div className="font-semibold text-[#d1d5dc] shrink-0" style={{ fontSize: "1.1vh", marginBottom: "0.3vh" }}>Big Road</div>
        <div className="grid flex-1 min-h-0" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, gridTemplateRows: `repeat(${ROWS}, 1fr)`, gap: "1px" }}>
          {Array.from({ length: ROWS * COLS }).map((_, idx) => {
            const col = Math.floor(idx / ROWS);
            const row = idx % ROWS;
            const dataIndex = col * ROWS + row;
            const result = beadRoad[dataIndex];
            return (
              <div key={idx} className="flex items-center justify-center">
                <div style={{ width: "80%", aspectRatio: "1", borderRadius: "20%", backgroundColor: result ? colorMap[result] : "rgba(30,41,57,0.3)" }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Score Counters */}
      <div className="grid grid-cols-3 shrink-0" style={{ gap: "0.3vw" }}>
        {[
          { label: "Player", bg: "#155dfc", text: "#dbeafe" },
          { label: "Tie", bg: "#00a63e", text: "#dcfce7" },
          { label: "Banker", bg: "#e7000b", text: "#ffe2e2" },
        ].map((s) => (
          <div key={s.label} className="flex flex-col items-center justify-center" style={{ backgroundColor: s.bg, borderRadius: "0.5vw", padding: "0.5vh 0" }}>
            <span className="text-white font-bold" style={{ fontSize: "1.8vh" }}>0</span>
            <span style={{ color: s.text, fontSize: "0.9vh" }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Next Prediction */}
      <div
        className="shrink-0 flex flex-col"
        style={{ backgroundColor: "#101828", border: "0.8px solid #364153", borderRadius: "0.6vw", padding: "0.4vh 0.6vw" }}
      >
        <div className="font-semibold text-[#d1d5dc]" style={{ fontSize: "1vh", marginBottom: "0.3vh" }}>Next Prediction</div>
        <div className="flex items-center justify-center" style={{ gap: "1vw" }}>
          {[
            { label: "P", bg: "#2b7fff", border: "#51a2ff" },
            { label: "T", bg: "#00c950", border: "#05df72" },
            { label: "B", bg: "#fb2c36", border: "#ff6467" },
          ].map((p) => (
            <div key={p.label} className="flex items-center" style={{ gap: "0.3vw" }}>
              <div className="rounded-full flex items-center justify-center" style={{ width: "2.2vh", height: "2.2vh", backgroundColor: p.bg, border: `1.6px solid ${p.border}` }}>
                <span className="text-white font-bold" style={{ fontSize: "1vh" }}>{p.label}</span>
              </div>
              <span className="text-[#99a1af]" style={{ fontSize: "1.2vh" }}>0%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
