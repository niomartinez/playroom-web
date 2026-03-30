export default function NextGamePanel() {
  return (
    <div
      className="rounded-[10px] flex flex-col h-full overflow-hidden"
      style={{
        background: "linear-gradient(142deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
        padding: "12px",
      }}
    >
      {/* Title */}
      <p
        className="font-semibold text-center shrink-0 mb-2"
        style={{ color: "#f0b100", fontSize: "clamp(11px, 1.1vw, 14px)", letterSpacing: "0.7px" }}
      >
        NEXT GAME
      </p>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        {/* BANKER column */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-normal text-center shrink-0" style={{ color: "#99a1af", fontSize: 11 }}>
            BANKER
          </p>
          <div className="flex flex-col items-center gap-1 flex-1 justify-center">
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 28, height: 28, borderRadius: "9999px", border: "2px solid #fb2c36" }}
            >
              <span className="font-bold" style={{ color: "#fb2c36", fontSize: 11 }}>B</span>
            </div>
            <div style={{ width: 20, height: 20, borderRadius: "9999px", border: "1px solid #4a5565" }} />
            <div style={{ width: 20, height: 20, borderRadius: "9999px", backgroundColor: "#e7000b" }} />
            <div className="flex items-center justify-center" style={{ width: 20, height: 20 }}>
              <div style={{ width: 4, height: 24, backgroundColor: "#e7000b", borderRadius: 4, transform: "rotate(45deg)" }} />
            </div>
          </div>
        </div>

        {/* PLAYER column */}
        <div className="flex flex-col items-center gap-1">
          <p className="font-normal text-center shrink-0" style={{ color: "#99a1af", fontSize: 11 }}>
            PLAYER
          </p>
          <div className="flex flex-col items-center gap-1 flex-1 justify-center">
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: 28, height: 28, borderRadius: "9999px", border: "2px solid #2b7fff" }}
            >
              <span className="font-bold" style={{ color: "#2b7fff", fontSize: 11 }}>P</span>
            </div>
            <div style={{ width: 20, height: 20, borderRadius: "9999px", border: "1px solid #4a5565" }} />
            <div style={{ width: 20, height: 20, borderRadius: "9999px", backgroundColor: "#155dfc" }} />
            <div className="flex items-center justify-center" style={{ width: 20, height: 20 }}>
              <div style={{ width: 4, height: 24, backgroundColor: "#155dfc", borderRadius: 4, transform: "rotate(45deg)" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
