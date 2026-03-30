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

  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="text-xs font-semibold text-[#99a1af] uppercase tracking-wider">
        Big Road
      </div>

      {/* Bead Road Grid */}
      <div className="grid grid-cols-6 gap-1">
        {beadRoad.map((result, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
            style={{ backgroundColor: colorMap[result] }}
          >
            {result}
          </div>
        ))}
      </div>

      {/* Score Counters */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[#2b7fff]/20 border border-[#2b7fff]/30 rounded-lg px-3 py-1.5">
          <span className="text-xs font-semibold text-[#2b7fff]">Player</span>
          <span className="text-sm font-bold text-white">0</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#00c950]/20 border border-[#00c950]/30 rounded-lg px-3 py-1.5">
          <span className="text-xs font-semibold text-[#00c950]">Tie</span>
          <span className="text-sm font-bold text-white">0</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#fb2c36]/20 border border-[#fb2c36]/30 rounded-lg px-3 py-1.5">
          <span className="text-xs font-semibold text-[#fb2c36]">Banker</span>
          <span className="text-sm font-bold text-white">0</span>
        </div>
      </div>

      {/* Next Prediction */}
      <div>
        <div className="text-xs text-[#6a7282] mb-1">Next Prediction</div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#2b7fff] font-semibold">P 0%</span>
          <span className="text-[#00c950] font-semibold">T 0%</span>
          <span className="text-[#fb2c36] font-semibold">B 0%</span>
        </div>
      </div>
    </div>
  );
}
