const COLS = 5;
const ROWS = 20;

export default function BeadRoad() {
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
      <h2 className="text-xs font-semibold mb-2" style={{ color: "#99a1af" }}>
        BEAD ROAD
      </h2>

      <div
        className="grid flex-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 20px)`,
          gridTemplateRows: `repeat(${ROWS}, 20px)`,
          gap: "1px",
          justifyContent: "center",
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{
              width: 20,
              height: 20,
              border: "1px solid rgba(208,135,0,0.1)",
              borderRadius: 2,
            }}
          >
            {/* Empty cell — filled circles will go here when wired to data */}
          </div>
        ))}
      </div>
    </div>
  );
}
