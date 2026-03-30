export default function StudioFooter() {
  return (
    <footer
      className="flex items-center justify-between shrink-0"
      style={{
        height: 45,
        background: "linear-gradient(to right, #000000 0%, #171717 50%, #000000 100%)",
        borderTop: "1px solid rgba(208,135,0,0.3)",
        padding: "13px 24px 0 24px",
      }}
    >
      {/* Left section */}
      <div className="flex items-center gap-6">
        {/* LIVE indicator */}
        <div className="flex items-center gap-2">
          <span
            className="inline-block rounded-full"
            style={{ width: 8, height: 8, backgroundColor: "#00bc7d" }}
          />
          <span className="font-normal leading-5" style={{ color: "#99a1af", fontSize: 14 }}>
            LIVE
          </span>
        </div>

        {/* Table */}
        <p className="font-normal leading-5 whitespace-nowrap" style={{ fontSize: 14 }}>
          <span style={{ color: "#6a7282" }}>Table: </span>
          <span className="font-semibold text-white">PRG-01</span>
        </p>

        {/* Dealer */}
        <p className="font-normal leading-5 whitespace-nowrap" style={{ fontSize: 14 }}>
          <span style={{ color: "#6a7282" }}>Dealer: </span>
          <span className="font-semibold text-white">Sarah M.</span>
        </p>
      </div>

      {/* Right section */}
      <p className="font-normal leading-5 whitespace-nowrap" style={{ color: "#6a7282", fontSize: 14 }}>
        Last Updated: <span className="text-white">12:45:32</span>
      </p>
    </footer>
  );
}
