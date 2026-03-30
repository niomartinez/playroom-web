const CHIP_COLORS = [
  "#fb2c36",
  "#2b7fff",
  "#00c950",
  "#d08700",
  "#9333ea",
  "#f97316",
];

export default function BalanceBar() {
  return (
    <div className="bg-[#101828] border border-[#364153] rounded-[14px] px-5 py-3 flex items-center justify-between">
      {/* Left: Balance */}
      <div className="flex items-center gap-3">
        {/* Wallet icon */}
        <svg
          className="w-5 h-5 text-[#99a1af]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z" />
          <path d="M16 12a1 1 0 102 0 1 1 0 00-2 0z" />
        </svg>
        <div>
          <div className="text-xs text-[#99a1af]">Balance</div>
          <div className="text-xl font-bold text-white">$10,000</div>
        </div>
      </div>

      {/* Right: Chip images */}
      <div className="flex items-center -space-x-1">
        {CHIP_COLORS.map((color, i) => (
          <div
            key={i}
            className="w-8 h-8 rounded-full border-2 border-[#101828] flex items-center justify-center"
            style={{
              background: `radial-gradient(circle at 40% 40%, ${color}, ${color}88)`,
              boxShadow: `0 2px 4px rgba(0,0,0,0.3)`,
            }}
          >
            <div
              className="w-5 h-5 rounded-full border border-white/30"
              style={{
                background: `radial-gradient(circle at 40% 40%, ${color}cc, ${color})`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
