/** Studio dashboard — placeholder for the full scoreboard UI.
 *  Will be replaced with the full Figma design implementation.
 */
export default function StudioDashboard() {
  return (
    <main className="min-h-screen p-4">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--gold)]">
            Play Room Studio
          </h1>
          <span className="text-xs px-2 py-0.5 bg-green-800 text-green-200 rounded-full">
            LIVE
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-[var(--text-gray)]">
          <span>Table: —</span>
          <span>COM: —</span>
          <form action="/api/studio/logout" method="POST">
            <button
              type="submit"
              className="text-red-400 hover:text-red-300 transition"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-[1fr_3fr_280px] gap-4 h-[calc(100vh-100px)]">
        {/* Left — Bead Road */}
        <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--gold-dim)] p-3">
          <h2 className="text-xs font-semibold text-[var(--text-gray)] mb-2">
            BEAD ROAD
          </h2>
          <div className="h-full bg-[var(--bg-panel-inner)] rounded" />
        </div>

        {/* Center — Roads + Cards */}
        <div className="flex flex-col gap-4">
          <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--gold-dim)] p-3 flex-1">
            <h2 className="text-xs font-semibold text-[var(--text-gray)] mb-2">
              BIG ROAD
            </h2>
            <div className="h-full bg-[var(--bg-panel-inner)] rounded" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[var(--bg-panel)] rounded border border-[var(--gold-dim)] p-2 h-24">
              <span className="text-[10px] text-[var(--text-dim)]">BIG EYE</span>
            </div>
            <div className="bg-[var(--bg-panel)] rounded border border-[var(--gold-dim)] p-2 h-24">
              <span className="text-[10px] text-[var(--text-dim)]">SMALL ROAD</span>
            </div>
            <div className="bg-[var(--bg-panel)] rounded border border-[var(--gold-dim)] p-2 h-24">
              <span className="text-[10px] text-[var(--text-dim)]">COCKROACH</span>
            </div>
          </div>
        </div>

        {/* Right — Score + Controls */}
        <div className="flex flex-col gap-4">
          <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--gold-dim)] p-4">
            <h2 className="text-xs font-semibold text-[var(--text-gray)] mb-3">
              SCORE
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-[var(--player-blue)]">0</div>
                <div className="text-[10px] text-[var(--text-dim)]">Player</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--tie-green)]">0</div>
                <div className="text-[10px] text-[var(--text-dim)]">Tie</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[var(--banker-red)]">0</div>
                <div className="text-[10px] text-[var(--text-dim)]">Banker</div>
              </div>
            </div>
          </div>

          <div className="bg-[var(--bg-panel)] rounded-lg border border-[var(--gold-dim)] p-4 flex-1">
            <h2 className="text-xs font-semibold text-[var(--text-gray)] mb-2">
              CURRENT ROUND
            </h2>
            <p className="text-[var(--text-dim)] text-sm">
              Waiting for Angel Eye...
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
