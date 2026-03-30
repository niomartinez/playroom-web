const COLS = 44;
const ROWS = 18;

export default function BigRoad() {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: "linear-gradient(104deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        borderRadius: 10,
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
        padding: "13px 17px",
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <p
          className="font-semibold leading-4"
          style={{ color: "#f0b100", fontSize: 12, letterSpacing: "0.6px" }}
        >
          BIG ROAD
        </p>
        <p
          className="font-medium leading-4"
          style={{ color: "#6a7282", fontSize: 12 }}
        >
          Game #18
        </p>
      </div>

      {/* Grid */}
      <div
        className="grid flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: "2px",
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{ minWidth: 0, minHeight: 0 }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "9999px",
                border: "1px solid #392c07",
                flexShrink: 0,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
