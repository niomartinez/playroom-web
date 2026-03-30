const scoreRows = [
  {
    label: "BANKER",
    count: 8,
    color: "#fb2c36",
    indicator: "outline" as const,
    indicatorColor: "#fb2c36",
  },
  {
    label: "PLAYER",
    count: 7,
    color: "#2b7fff",
    indicator: "outline" as const,
    indicatorColor: "#2b7fff",
  },
  {
    label: "TIE",
    count: 2,
    color: "#00bc7d",
    indicator: "filled" as const,
    indicatorColor: "#00bc7d",
  },
  {
    label: "BANKER PAIR",
    count: 1,
    color: "#fb2c36",
    indicator: "dot" as const,
    indicatorColor: "#fb2c36",
  },
  {
    label: "PLAYER PAIR",
    count: 1,
    color: "#2b7fff",
    indicator: "dot" as const,
    indicatorColor: "#2b7fff",
  },
  {
    label: "LUCKY 6",
    count: 0,
    color: "#f0b100",
    indicator: "filled" as const,
    indicatorColor: "#f0b100",
  },
  {
    label: "DRAGON 7",
    count: 0,
    color: "#ff009d",
    indicator: "filled" as const,
    indicatorColor: "#ff009d",
  },
  {
    label: "PANDA 8",
    count: 0,
    color: "#00ffe5",
    indicator: "filled" as const,
    indicatorColor: "#00ffe5",
  },
  {
    label: "GAME NUMBER",
    count: 18,
    color: "#f0b100",
    indicator: "none" as const,
    indicatorColor: "transparent",
  },
];

function Indicator({
  type,
  color,
}: {
  type: "outline" | "filled" | "dot" | "none";
  color: string;
}) {
  if (type === "none") {
    return <span className="w-4 h-4 inline-block" />;
  }

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

  // dot: white outline with small colored dot inside
  return (
    <span
      className="relative inline-block w-4 h-4 rounded-full"
      style={{ border: "2px solid #ffffff" }}
    >
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

export default function ScorePanel() {
  return (
    <div
      className="rounded-[10px] p-4"
      style={{
        background: "linear-gradient(123deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
      }}
    >
      <div className="flex flex-col gap-0.5">
        {scoreRows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-3 rounded-[4px]"
            style={{ backgroundColor: "rgba(0,0,0,0.4)", height: "48px" }}
          >
            <div className="flex items-center gap-3">
              <Indicator type={row.indicator} color={row.indicatorColor} />
              <span className="text-sm font-medium text-white">
                {row.label}
              </span>
            </div>
            <span
              className="text-2xl font-bold"
              style={{ color: row.color }}
            >
              {row.count}
            </span>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div
        className="mt-3"
        style={{ borderTop: "1px solid rgba(208,135,0,0.2)" }}
      />
    </div>
  );
}
