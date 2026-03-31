"use client";

import { useStudio } from "@/lib/studio-context";

function Indicator({ type, color }: { type: string; color: string }) {
  if (type === "none") return <span className="inline-block w-4 h-4 shrink-0" />;

  if (type === "filled") {
    return (
      <span
        className="inline-block w-4 h-4 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
    );
  }

  if (type === "outline") {
    return (
      <span
        className="inline-block w-4 h-4 rounded-full shrink-0"
        style={{ border: `2px solid ${color}` }}
      />
    );
  }

  const dotColor = type === "pairBanker" ? "#fb2c36" : "#2b7fff";
  return (
    <span className="relative inline-block w-4 h-4 shrink-0">
      <span className="absolute inset-0 rounded-full" style={{ border: "0.5px solid white" }} />
      <span
        className="absolute rounded-full"
        style={{ width: 6, height: 6, backgroundColor: dotColor, top: 0, left: 0 }}
      />
    </span>
  );
}

export default function ScorePanel() {
  const { roads } = useStudio();

  const totalGames = roads.beadRoad.length;

  // Count pairs from road entries
  let bankerPairCount = 0;
  let playerPairCount = 0;
  for (const entry of roads.beadRoad) {
    if (entry.bankerPair) bankerPairCount++;
    if (entry.playerPair) playerPairCount++;
  }

  const scoreRows = [
    { label: "BANKER", count: roads.bankerWins, color: "#fb2c36", indicator: "outline" as const },
    { label: "PLAYER", count: roads.playerWins, color: "#2b7fff", indicator: "outline" as const },
    { label: "TIE", count: roads.ties, color: "#00bc7d", indicator: "filled" as const },
    { label: "BANKER PAIR", count: bankerPairCount, color: "#fb2c36", indicator: "pairBanker" as const },
    { label: "PLAYER PAIR", count: playerPairCount, color: "#2b7fff", indicator: "pairPlayer" as const },
    { label: "LUCKY 6", count: 0, color: "#f0b100", indicator: "filled" as const },
    { label: "DRAGON 7", count: 0, color: "#ff009d", indicator: "filled" as const },
    { label: "PANDA 8", count: 0, color: "#00ffe5", indicator: "filled" as const },
    { label: "GAME NUMBER", count: totalGames, color: "#f0b100", indicator: "none" as const },
  ];

  return (
    <div
      className="rounded-[10px] flex flex-col h-full overflow-hidden"
      style={{
        background: "linear-gradient(123deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
        padding: "8px 12px",
      }}
    >
      <div className="flex flex-col gap-[2px] flex-1 min-h-0">
        {scoreRows.map((row, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded flex-1 min-h-0 px-2"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          >
            <div className="flex items-center gap-2">
              <Indicator type={row.indicator} color={row.color} />
              <span
                className="font-medium whitespace-nowrap"
                style={{
                  fontSize: "clamp(10px, 1.1vw, 14px)",
                  color: row.indicator === "none" ? "#f0b100" : "white",
                }}
              >
                {row.label}
              </span>
            </div>
            <span
              className="font-bold"
              style={{ fontSize: "clamp(16px, 1.8vw, 24px)", color: row.color }}
            >
              {row.count}
            </span>
          </div>
        ))}
      </div>

      <div className="shrink-0 mt-1" style={{ borderTop: "1px solid rgba(208,135,0,0.2)" }} />
    </div>
  );
}
