export default function BalanceBar() {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2"
      style={{
        backgroundColor: "#101828",
        border: "0.8px solid #364153",
        borderRadius: "14px",
      }}
    >
      <svg
        className="w-5 h-5 text-[#99a1af] flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z" />
        <path d="M16 12a1 1 0 102 0 1 1 0 00-2 0z" />
      </svg>
      <div>
        <div className="text-[10px] text-[#99a1af]">Balance</div>
        <div className="font-bold text-base text-white">$10,000</div>
      </div>
    </div>
  );
}
