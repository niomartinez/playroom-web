interface DerivedRoadProps {
  title: string;
  cols?: number;
  rows?: number;
}

export default function DerivedRoad({
  title,
  cols = 22,
  rows = 6,
}: DerivedRoadProps) {
  return (
    <div
      className="flex flex-col h-full overflow-hidden"
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
        className="font-semibold shrink-0 mb-2"
        style={{ color: "#f0b100", fontSize: 12, letterSpacing: "0.6px", lineHeight: "16px" }}
      >
        {title}
      </p>

      <div
        className="grid flex-1"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: "1px",
        }}
      >
        {Array.from({ length: cols * rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-center">
            <div
              style={{
                width: "75%",
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
