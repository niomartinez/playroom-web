export default function NextGamePanel() {
  return (
    <div
      className="rounded-[10px] flex flex-col gap-4 mt-4"
      style={{
        background: "linear-gradient(142deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
        padding: "21px",
      }}
    >
      {/* Title */}
      <p
        className="font-semibold leading-5 text-center"
        style={{ color: "#f0b100", fontSize: 14, letterSpacing: "0.7px" }}
      >
        NEXT GAME
      </p>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-4">
        {/* BANKER column */}
        <div className="flex flex-col items-center gap-2">
          <p className="font-normal text-center leading-4" style={{ color: "#99a1af", fontSize: 12 }}>
            BANKER
          </p>
          <div className="flex flex-col items-center gap-2">
            {/* B badge circle */}
            <div
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: "9999px",
                border: "2px solid #fb2c36",
              }}
            >
              <span className="font-bold text-center" style={{ color: "#fb2c36", fontSize: 12, lineHeight: "16px" }}>
                B
              </span>
            </div>
            {/* Empty circle */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "9999px",
                border: "1px solid #4a5565",
              }}
            />
            {/* Filled red circle */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "9999px",
                backgroundColor: "#e7000b",
              }}
            />
            {/* Diagonal line indicator */}
            <div className="flex items-center justify-center" style={{ width: 23, height: 23 }}>
              <div
                style={{
                  width: 4,
                  height: 28,
                  backgroundColor: "#e7000b",
                  borderRadius: 5,
                  transform: "rotate(45deg)",
                }}
              />
            </div>
          </div>
        </div>

        {/* PLAYER column */}
        <div className="flex flex-col items-center gap-2">
          <p className="font-normal text-center leading-4" style={{ color: "#99a1af", fontSize: 12 }}>
            PLAYER
          </p>
          <div className="flex flex-col items-center gap-2">
            {/* P badge circle */}
            <div
              className="flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                borderRadius: "9999px",
                border: "2px solid #2b7fff",
              }}
            >
              <span className="font-bold text-center" style={{ color: "#2b7fff", fontSize: 12, lineHeight: "16px" }}>
                P
              </span>
            </div>
            {/* Empty circle */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "9999px",
                border: "1px solid #4a5565",
              }}
            />
            {/* Filled blue circle */}
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "9999px",
                backgroundColor: "#155dfc",
              }}
            />
            {/* Diagonal line indicator */}
            <div className="flex items-center justify-center" style={{ width: 23, height: 23 }}>
              <div
                style={{
                  width: 4,
                  height: 28,
                  backgroundColor: "#155dfc",
                  borderRadius: 5,
                  transform: "rotate(45deg)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
