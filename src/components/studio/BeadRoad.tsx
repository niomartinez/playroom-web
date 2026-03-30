const COLS = 5;
const ROWS = 20;

export default function BeadRoad() {
  return (
    <div
      className="flex flex-col gap-3 h-full"
      style={{
        background: "linear-gradient(104deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        borderRadius: 10,
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
        padding: "13px",
      }}
    >
      <p
        className="font-semibold leading-4"
        style={{ color: "#f0b100", fontSize: 12, letterSpacing: "0.6px" }}
      >
        BEAD ROAD
      </p>

      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 20px)`,
          gridTemplateRows: `repeat(${ROWS}, 20px)`,
          gap: "2px",
        }}
      >
        {Array.from({ length: COLS * ROWS }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{ width: 20, height: 20, padding: 2 }}
          >
            {/* Empty cell: dark gold circle outline */}
            <div
              style={{
                width: 16,
                height: 16,
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
