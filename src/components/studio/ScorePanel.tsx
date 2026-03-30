const scoreRows = [
  { label: "BANKER", count: 8, color: "#fb2c36", indicator: "outline" as const },
  { label: "PLAYER", count: 9, color: "#2b7fff", indicator: "outline" as const },
  { label: "TIE", count: 1, color: "#00bc7d", indicator: "filled" as const },
  { label: "BANKER PAIR", count: 8, color: "#fb2c36", indicator: "pairBanker" as const },
  { label: "BANKER PAIR", count: 9, color: "#2b7fff", indicator: "pairPlayer" as const },
  { label: "LUCKY 6", count: 1, color: "#f0b100", indicator: "filled" as const },
  { label: "DRAGON 7", count: 9, color: "#ff009d", indicator: "filled" as const },
  { label: "PANDA 8", count: 1, color: "#00ffe5", indicator: "filled" as const },
  { label: "GAME NUMBER", count: 1, color: "#f0b100", indicator: "none" as const },
];

function Indicator({ type, color }: { type: string; color: string }) {
  if (type === "none") return <span className="inline-block w-4 h-4" />;

  if (type === "filled") {
    return (
      <span
        className="inline-block w-4 h-4 rounded-full"
        style={{ backgroundColor: color }}
      />
    );
  }

  if (type === "outline") {
    return (
      <span
        className="inline-block w-4 h-4 rounded-full"
        style={{ border: `2px solid ${color}` }}
      />
    );
  }

  // pairBanker / pairPlayer: white outline circle with small colored dot
  const dotColor = type === "pairBanker" ? "#fb2c36" : "#2b7fff";
  return (
    <span className="relative inline-block w-4 h-4">
      <span
        className="absolute inset-0 rounded-full"
        style={{ border: "0.5px solid white" }}
      />
      <span
        className="absolute rounded-full"
        style={{
          width: 6,
          height: 6,
          backgroundColor: dotColor,
          top: 0,
          left: 0,
        }}
      />
    </span>
  );
}

export default function ScorePanel() {
  return (
    <div
      className="rounded-[10px] flex flex-col"
      style={{
        background: "linear-gradient(123deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
        padding: "12px 21px 1px 21px",
      }}
    >
      <div className="flex flex-col gap-0.5">
        {scoreRows.map((row, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded"
            style={{
              backgroundColor: "rgba(0,0,0,0.4)",
              height: 48,
              padding: "0 8px",
            }}
          >
            <div className="flex items-center gap-2">
              <Indicator type={row.indicator} color={row.color} />
              <span
                className="font-medium leading-5 whitespace-nowrap"
                style={{
                  fontSize: 14,
                  color: row.indicator === "none" ? "#f0b100" : "white",
                }}
              >
                {row.label}
              </span>
            </div>
            <span
              className="font-bold leading-8"
              style={{ fontSize: 24, color: row.color }}
            >
              {row.count}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ borderTop: "1px solid rgba(208,135,0,0.2)", marginTop: 4 }} />
    </div>
  );
}
