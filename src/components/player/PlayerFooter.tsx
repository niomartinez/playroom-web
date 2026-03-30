export default function PlayerFooter() {
  return (
    <footer
      className="flex flex-col items-center justify-center h-full"
      style={{
        backgroundColor: "#030712",
        borderTop: "0.8px solid #1e2939",
      }}
    >
      <img src="/logo.png" alt="Play Room Gaming" className="object-contain" style={{ height: "4vh" }} />
      <div className="text-[#6a7282] text-center" style={{ fontSize: "1vh", marginTop: "0.3vh" }}>
        Play responsibly. This is a demo application for entertainment purposes only.
      </div>
    </footer>
  );
}
