const COLS = 44;
const ROWS = 18;

export default function BigRoad() {
  return (
    <div
      className="rounded-[10px] p-3 h-full flex flex-col"
      style={{
        background: "linear-gradient(123deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold" style={{ color: "#99a1af" }}>
          BIG ROAD
        </h2>
        <span className="text-xs font-medium" style={{ color: "#6a7282" }}>
          Game #18
        </span>
      </div>

      {/* Grid */}
      <div
        className="grid flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: "1px",
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{
              border: "1px solid rgba(208,135,0,0.07)",
              borderRadius: 1,
              minWidth: 0,
              minHeight: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}
