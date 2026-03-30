export default function BalanceBar() {
  return (
    <div
      className="flex items-center gap-[12px] px-[16.8px]"
      style={{
        backgroundColor: "#101828",
        border: "0.8px solid #364153",
        borderRadius: "14px",
        height: "81.6px",
      }}
    >
      {/* Wallet icon */}
      <svg
        className="w-[24px] h-[24px] text-[#99a1af] flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z" />
        <path d="M16 12a1 1 0 102 0 1 1 0 00-2 0z" />
      </svg>
      <div>
        <div className="text-[12px] text-[#99a1af]">Balance</div>
        <div className="font-bold text-[20px] text-white">$10,000</div>
      </div>
    </div>
  );
}
