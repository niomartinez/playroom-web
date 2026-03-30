export default function PlayerFooter() {
  return (
    <footer
      className="text-center py-8 px-6"
      style={{
        background: "linear-gradient(to bottom, #050d1c, #101828)",
      }}
    >
      <div className="flex justify-center mb-4">
        <img
          src="/logo.png"
          alt="Play Room Gaming"
          className="object-contain"
          style={{ width: 280, height: 150 }}
        />
      </div>
      <div className="text-xs text-[#6a7282]">
        Play responsibly. This is a demo application for entertainment purposes
        only.
      </div>
    </footer>
  );
}
