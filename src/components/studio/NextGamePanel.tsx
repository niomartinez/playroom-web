export default function NextGamePanel() {
  return (
    <div
      className="rounded-[10px] p-4 mt-4"
      style={{
        background: "linear-gradient(123deg, #171717 0%, #000000 100%)",
        border: "1px solid rgba(208,135,0,0.3)",
        boxShadow:
          "0px 10px 15px rgba(208,135,0,0.1), 0px 4px 6px rgba(208,135,0,0.1)",
      }}
    >
      {/* Title */}
      <h3 className="text-sm font-semibold text-white text-center mb-4">
        NEXT GAME
      </h3>

      {/* Two columns */}
      <div className="flex justify-around">
        {/* Banker column */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium" style={{ color: "#fb2c36" }}>
            BANKER
          </span>
          <div className="flex flex-col items-center gap-2">
            <span
              className="inline-block w-6 h-6 rounded-full"
              style={{ backgroundColor: "#fb2c36", opacity: 0.6 }}
            />
            <span
              className="inline-block w-6 h-6 rounded-full"
              style={{ backgroundColor: "#fb2c36", opacity: 0.3 }}
            />
            <span
              className="inline-block w-6 h-6 rounded-full"
              style={{ backgroundColor: "#fb2c36", opacity: 0.15 }}
            />
          </div>
        </div>

        {/* Player column */}
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs font-medium" style={{ color: "#2b7fff" }}>
            PLAYER
          </span>
          <div className="flex flex-col items-center gap-2">
            <span
              className="inline-block w-6 h-6 rounded-full"
              style={{ backgroundColor: "#2b7fff", opacity: 0.6 }}
            />
            <span
              className="inline-block w-6 h-6 rounded-full"
              style={{ backgroundColor: "#2b7fff", opacity: 0.3 }}
            />
            <span
              className="inline-block w-6 h-6 rounded-full"
              style={{ backgroundColor: "#2b7fff", opacity: 0.15 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
