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
      className="rounded-[10px] p-3 h-full flex flex-col"
      style={{
        background: "linear-gradient(123deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
      }}
    >
      <h2 className="text-xs font-semibold mb-2" style={{ color: "#99a1af" }}>
        {title}
      </h2>

      <div
        className="grid flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: "1px",
        }}
      >
        {Array.from({ length: cols * rows }).map((_, i) => (
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
