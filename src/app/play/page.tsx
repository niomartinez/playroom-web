/** Player-facing live baccarat UI — placeholder.
 *  Will be replaced with the full Figma design implementation.
 */
export default function PlayerUI() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 bg-[var(--bg-panel)] border-b border-[var(--gold-dim)]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-[var(--gold)]">
            Play Room Gaming
          </span>
          <span className="text-xs text-[var(--text-gray)]">Live Baccarat</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
          <span className="text-[var(--text-gray)]">Round #—</span>
        </div>
      </header>

      {/* Video area */}
      <div className="flex-1 bg-black flex items-center justify-center min-h-[400px]">
        <p className="text-[var(--text-dim)]">Live video stream</p>
      </div>

      {/* Betting panel */}
      <div className="bg-[var(--bg-panel)] border-t border-[var(--gold-dim)] p-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-3">
          <button className="py-6 rounded-lg bg-[var(--player-blue)] font-bold text-lg hover:opacity-90 transition">
            PLAYER
          </button>
          <button className="py-6 rounded-lg bg-[var(--tie-green)] font-bold text-lg hover:opacity-90 transition">
            TIE
          </button>
          <button className="py-6 rounded-lg bg-[var(--banker-red)] font-bold text-lg hover:opacity-90 transition">
            BANKER
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-3 text-xs text-[var(--text-dim)]">
        Play responsibly. This is a demo application for entertainment purposes only.
      </footer>
    </main>
  );
}
