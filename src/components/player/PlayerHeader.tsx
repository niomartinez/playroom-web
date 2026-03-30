export default function PlayerHeader() {
  return (
    <header
      className="flex items-center justify-between px-6 py-3 border-b border-[#364153] flex-shrink-0"
      style={{
        background: "linear-gradient(to right, #101828, #1e2939)",
        boxShadow: "0px 25px 50px rgba(0,0,0,0.25)",
      }}
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-3">
        <img
          src="/logo.png"
          alt="Play Room Gaming"
          className="object-contain"
          style={{ width: 100, height: 48 }}
        />
        <span className="text-sm text-[#99a1af]">Live Baccarat</span>
      </div>

      {/* Right: Badges */}
      <div className="flex items-center gap-3">
        {/* LIVE badge */}
        <div className="flex items-center gap-2 bg-[#1e2939] border border-[#364153] rounded-[10px] px-4 py-2">
          <span
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: "#fb2c36", opacity: 0.7 }}
          />
          <span className="text-base font-semibold text-white">LIVE</span>
        </div>

        {/* Round badge */}
        <div className="flex items-center gap-2 bg-[#1e2939] border border-[#364153] rounded-[10px] px-4 py-2">
          <svg
            className="w-4 h-4 text-[#99a1af]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="text-base font-semibold text-white">Round #50</span>
        </div>
      </div>
    </header>
  );
}
