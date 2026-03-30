export default function PlayerFooter() {
  return (
    <footer
      className="flex flex-col items-center justify-center py-3 px-6"
      style={{
        backgroundColor: "#030712",
        borderTop: "0.8px solid #1e2939",
      }}
    >
      <img
        src="/logo.png"
        alt="Play Room Gaming"
        className="object-contain"
        style={{ width: 100, height: 40 }}
      />
      <div className="text-[12px] text-[#6a7282] text-center mt-1">
        Play responsibly. This is a demo application for entertainment purposes only.
      </div>
    </footer>
  );
}
