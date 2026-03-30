const COLS = 44;
const ROWS = 18;

export default function BigRoad() {
  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: "linear-gradient(104deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        borderRadius: 10,
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
        padding: "13px 17px",
      }}
    >
      <div className="flex items-center justify-between mb-2 shrink-0">
        <p
          className="font-semibold"
          style={{ color: "#f0b100", fontSize: 12, letterSpacing: "0.6px", lineHeight: "16px" }}
        >
          BIG ROAD
        </p>
        <p className="font-medium" style={{ color: "#6a7282", fontSize: 12, lineHeight: "16px" }}>
          Game #18
        </p>
      </div>

      <div
        className="grid flex-1"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          gap: "1px",
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            <div
              style={{
                width: "80%",
                aspectRatio: "1",
                borderRadius: "9999px",
                border: "1px solid #392c07",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
