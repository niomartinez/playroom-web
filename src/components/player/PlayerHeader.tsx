export default function PlayerHeader() {
  return (
    <header
      className="flex items-center justify-between px-[1.5vw] border-b border-[#364153] min-h-0 h-full"
      style={{
        background: "linear-gradient(to right, #101828, #1e2939)",
        boxShadow: "0px 25px 50px rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex items-center gap-[0.8vw]">
        <img src="/logo.png" alt="Play Room Gaming" className="object-contain h-[3.5vh]" />
        <span className="text-[1.1vh] text-[#99a1af]">Live Baccarat</span>
      </div>
      <div className="flex items-center gap-[0.6vw]">
        <div className="flex items-center gap-[0.4vw] bg-[#1e2939] border border-[#364153] rounded-[0.6vw] px-[0.8vw] py-[0.4vh]">
          <span className="rounded-full" style={{ width: "0.8vh", height: "0.8vh", backgroundColor: "#fb2c36", opacity: 0.7 }} />
          <span className="font-semibold text-white" style={{ fontSize: "1.2vh" }}>LIVE</span>
        </div>
        <div className="flex items-center gap-[0.4vw] bg-[#1e2939] border border-[#364153] rounded-[0.6vw] px-[0.8vw] py-[0.4vh]">
          <svg className="text-[#99a1af]" style={{ width: "1.2vh", height: "1.2vh" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span className="font-semibold text-white" style={{ fontSize: "1.2vh" }}>Round #50</span>
        </div>
      </div>
    </header>
  );
}
