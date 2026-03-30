export default function BalanceBar() {
  return (
    <div
      className="flex items-center h-full"
      style={{
        backgroundColor: "#101828",
        border: "0.8px solid #364153",
        borderRadius: "1vw",
        padding: "0 1vw",
        gap: "0.6vw",
      }}
    >
      <svg className="text-[#99a1af] flex-shrink-0" style={{ width: "1.8vh", height: "1.8vh" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z" />
        <path d="M16 12a1 1 0 102 0 1 1 0 00-2 0z" />
      </svg>
      <div>
        <div className="text-[#99a1af]" style={{ fontSize: "1vh" }}>Balance</div>
        <div className="font-bold text-white" style={{ fontSize: "1.6vh" }}>$10,000</div>
      </div>
    </div>
  );
}
