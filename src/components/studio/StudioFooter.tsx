export default function StudioFooter() {
  return (
    <footer
      className="flex items-center justify-between px-6 pt-[13px] pb-3 h-[45px] shrink-0"
      style={{
        background: "linear-gradient(to right, #000000, #171717, #000000)",
        borderTop: "1px solid rgba(208,135,0,0.3)",
      }}
    >
      {/* Left section */}
      <div className="flex items-center gap-4 text-sm font-normal" style={{ fontFamily: "Inter, sans-serif" }}>
        {/* LIVE indicator */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: "#00bc7d" }}
          />
          <span style={{ color: "#99a1af" }}>LIVE</span>
        </div>

        <span style={{ color: "rgba(208,135,0,0.2)" }}>|</span>

        {/* Table */}
        <div>
          <span style={{ color: "#6a7282" }}>Table:&nbsp;</span>
          <span className="font-bold text-white">PRG-01</span>
        </div>

        <span style={{ color: "rgba(208,135,0,0.2)" }}>|</span>

        {/* Dealer */}
        <div>
          <span style={{ color: "#6a7282" }}>Dealer:&nbsp;</span>
          <span className="font-bold text-white">Sarah M.</span>
        </div>
      </div>

      {/* Right section */}
      <div className="text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
        <span style={{ color: "#6a7282" }}>Last Updated:&nbsp;</span>
        <span className="text-white">12:45:32</span>
      </div>
    </footer>
  );
}
