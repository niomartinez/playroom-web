"use client";

import { useState } from "react";

interface AdminManualDialogProps {
  open: boolean;
  onClose: () => void;
}

function handlePrint() {
  const content = document.getElementById("admin-manual-content");
  if (!content) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Admin Manual — Play Room Gaming</title>
    <style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#222;line-height:1.7}
    h1{color:#b8860b;border-bottom:2px solid #b8860b;padding-bottom:8px}h2{color:#b8860b;margin-top:32px;border-bottom:1px solid #ddd;padding-bottom:6px}h3{color:#555;margin-top:20px}
    table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:8px;border:1px solid #ddd;text-align:left}
    th{background:#f5f5f5;font-weight:600}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:13px}
    @media print{body{margin:0;padding:20px}}</style></head><body>
    <h1>Play Room Gaming — Admin Manual</h1>${content.innerHTML}</body></html>`);
  win.document.close();
  win.print();
}

const SECTIONS = [
  { id: "overview", title: "1. Dashboard Overview" },
  { id: "operators", title: "2. Operators" },
  { id: "tables", title: "3. Tables" },
  { id: "rounds", title: "4. Rounds" },
  { id: "players", title: "5. Players" },
  { id: "users", title: "6. Admin Users" },
  { id: "settings", title: "7. Settings" },
  { id: "monitoring", title: "8. Monitoring" },
  { id: "studio", title: "9. Studio Dealer Guide" },
  { id: "player-ui", title: "10. Player UI" },
  { id: "emulator", title: "11. Emulator" },
];

export default function AdminManualDialog({ open, onClose }: AdminManualDialogProps) {
  const [search, setSearch] = useState("");

  if (!open) return null;

  const q = search.toLowerCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: "min(90vw, 860px)",
          height: "min(90vh, 760px)",
          background: "linear-gradient(135deg, #171717, #000000)",
          border: "1px solid rgba(208,135,0,0.3)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(208,135,0,0.2)" }}
        >
          <div className="flex items-center gap-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d08700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <h2 className="font-bold text-white" style={{ fontSize: 18 }}>Admin Manual</h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search manual..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-xs text-white outline-none w-44"
              style={{ backgroundColor: "rgba(0,0,0,0.6)", border: "1px solid rgba(208,135,0,0.15)" }}
            />
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ backgroundColor: "rgba(208,135,0,0.2)", color: "#d08700", border: "1px solid rgba(208,135,0,0.4)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / PDF
            </button>
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-lg transition-opacity hover:opacity-80"
              style={{ width: 32, height: 32, backgroundColor: "rgba(255,255,255,0.06)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#99a1af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* TOC sidebar + content */}
        <div className="flex flex-1 min-h-0">
          {/* TOC */}
          <nav
            className="shrink-0 w-52 overflow-y-auto py-4 px-3 hidden sm:block"
            style={{ borderRight: "1px solid rgba(208,135,0,0.1)" }}
          >
            {SECTIONS.filter((s) => !q || s.title.toLowerCase().includes(q)).map((s) => (
              <a
                key={s.id}
                href={`#manual-${s.id}`}
                className="block rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
                style={{ color: "#99a1af" }}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(`manual-${s.id}`)?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {s.title}
              </a>
            ))}
          </nav>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-5" style={{ color: "#d1d5db" }}>
            <style>{`
              .admin-manual h2 { color: #d08700; font-size: 17px; font-weight: 700; margin: 28px 0 12px; letter-spacing: 0.03em; padding-bottom: 6px; border-bottom: 1px solid rgba(208,135,0,0.15); }
              .admin-manual h2:first-child { margin-top: 0; }
              .admin-manual h3 { color: #f0b100; font-size: 14px; font-weight: 600; margin: 18px 0 8px; }
              .admin-manual p { font-size: 13px; line-height: 1.7; margin: 0 0 10px; color: #d1d5db; }
              .admin-manual ul, .admin-manual ol { font-size: 13px; line-height: 1.7; margin: 0 0 10px; padding-left: 18px; color: #d1d5db; }
              .admin-manual li { margin: 3px 0; }
              .admin-manual code { background: rgba(208,135,0,0.1); color: #f0b100; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
              .admin-manual table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
              .admin-manual th { text-align: left; color: #d08700; padding: 6px 8px; border-bottom: 1px solid rgba(208,135,0,0.2); font-weight: 600; }
              .admin-manual td { padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #d1d5db; }
              .admin-manual .tip { background: rgba(0,188,125,0.08); border: 1px solid rgba(0,188,125,0.2); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #7ddfb0; margin: 10px 0; }
              .admin-manual .warn { background: rgba(251,44,54,0.1); border: 1px solid rgba(251,44,54,0.3); border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #fb8080; margin: 10px 0; }
            `}</style>

            <div className="admin-manual" id="admin-manual-content">
              {/* Section 1: Dashboard */}
              <h2 id="manual-overview">1. Dashboard Overview</h2>
              <p>The admin dashboard shows real-time platform stats:</p>
              <ul>
                <li><strong>Active Tables</strong> — tables currently open for play</li>
                <li><strong>Players Online</strong> — connected player sessions</li>
                <li><strong>Rounds Today</strong> — completed rounds in the last 24 hours</li>
                <li><strong>Revenue Today</strong> — net operator revenue</li>
              </ul>
              <p>The dashboard also shows recent rounds, active table status, and quick links to common actions.</p>

              {/* Section 2: Operators */}
              <h2 id="manual-operators">2. Operators</h2>
              <p>Operators are B2B customers who integrate your baccarat games into their casino platform.</p>

              <h3>Creating an Operator</h3>
              <ol>
                <li>Click <strong>Create Operator</strong></li>
                <li>Enter name, wallet URL, and wallet mode (seamless or transfer)</li>
                <li>Click Save — a <code>client_id</code> and <code>api_key</code> are generated</li>
                <li>Share the credentials with the operator for their integration</li>
              </ol>

              <h3>Managing Operators</h3>
              <ul>
                <li><strong>Edit</strong> — change name, wallet URL, wallet mode, allowed IPs</li>
                <li><strong>Regenerate API Key</strong> — invalidates the old key immediately</li>
                <li><strong>Deactivate</strong> — stops all API access for that operator</li>
                <li><strong>Allowed IPs</strong> — restrict API calls to specific IP addresses</li>
              </ul>
              <div className="warn">Regenerating an API key is irreversible. The operator must update their integration immediately.</div>

              {/* Section 3: Tables */}
              <h2 id="manual-tables">3. Tables</h2>
              <p>Tables represent individual baccarat game instances.</p>

              <h3>Creating a Table</h3>
              <ol>
                <li>Click <strong>Create Table</strong></li>
                <li>Enter name, external game ID, type (standard/VIP/speed), and bet limits</li>
                <li>The table starts as inactive — open it when ready</li>
              </ol>

              <h3>Table Actions</h3>
              <table>
                <thead><tr><th>Action</th><th>Effect</th></tr></thead>
                <tbody>
                  <tr><td><strong>Open</strong></td><td>Table appears in lobby, players can join</td></tr>
                  <tr><td><strong>Close</strong></td><td>Table removed from lobby, current round finishes</td></tr>
                  <tr><td><strong>Edit</strong></td><td>Change bet limits, dealer name, stream settings</td></tr>
                  <tr><td><strong>Deactivate</strong></td><td>Permanently removes table (can reactivate)</td></tr>
                </tbody>
              </table>

              <h3>Stream Configuration</h3>
              <p>Each table can have a live video stream. Set the <strong>Stream URL</strong> and <strong>Stream Key</strong> in the table detail page. The studio dealer starts the stream via OBS.</p>

              {/* Section 4: Rounds */}
              <h2 id="manual-rounds">4. Rounds</h2>
              <p>Each round represents one baccarat hand. Rounds progress through these states:</p>
              <table>
                <thead><tr><th>Status</th><th>Meaning</th></tr></thead>
                <tbody>
                  <tr><td><code>betting_open</code></td><td>Players can place bets</td></tr>
                  <tr><td><code>betting_closed</code></td><td>No more bets, waiting for cards</td></tr>
                  <tr><td><code>dealing</code></td><td>Cards being dealt</td></tr>
                  <tr><td><code>result</code></td><td>Winner determined</td></tr>
                  <tr><td><code>settling</code></td><td>Processing wallet transactions</td></tr>
                  <tr><td><code>settled</code></td><td>All bets paid out</td></tr>
                  <tr><td><code>voided</code></td><td>Round cancelled, bets refunded</td></tr>
                </tbody>
              </table>

              <h3>Voiding a Round</h3>
              <p>Use <strong>Void Round</strong> to cancel an in-progress round (before settlement). All bets are refunded to players. Voided rounds cannot be un-voided.</p>
              <div className="warn">Only void rounds when there was a dealing error. Settled rounds cannot be voided.</div>

              <h3>Filtering Rounds</h3>
              <p>Filter by table, status, and date range. Click a round to see card details, individual bets, and settlement info.</p>

              {/* Section 5: Players */}
              <h2 id="manual-players">5. Players</h2>
              <p>Players are end-users authenticated through their operator. Each player has a balance managed by the operator&apos;s wallet system.</p>

              <h3>Player Detail</h3>
              <ul>
                <li><strong>Balance</strong> — current cached balance (synced with operator wallet)</li>
                <li><strong>Bet Statistics</strong> — total bets, wagered amount, payouts, net result</li>
                <li><strong>Transaction History</strong> — every credit/debit with timestamps</li>
              </ul>

              <h3>Kicking a Player</h3>
              <p>Use <strong>Kick Player</strong> to revoke all active tokens and disconnect the player. They must re-authenticate through their operator to rejoin.</p>
              <div className="tip">Use kick when a player reports a compromised session or when investigating suspicious activity.</div>

              {/* Section 6: Admin Users */}
              <h2 id="manual-users">6. Admin Users</h2>
              <p>Admin users have access to this panel. Three roles are available:</p>
              <table>
                <thead><tr><th>Role</th><th>Access</th></tr></thead>
                <tbody>
                  <tr><td><strong>Super Admin</strong></td><td>Full access — all sections, user management, danger zone</td></tr>
                  <tr><td><strong>Operator Admin</strong></td><td>Operators, tables, rounds, players, reports</td></tr>
                  <tr><td><strong>Viewer</strong></td><td>Read-only access to all sections</td></tr>
                </tbody>
              </table>

              <h3>Managing Users</h3>
              <ul>
                <li><strong>Create</strong> — email, display name, password, role</li>
                <li><strong>Edit</strong> — change name, role, or reset password</li>
                <li><strong>Deactivate</strong> — blocks login (does not delete)</li>
              </ul>

              {/* Section 7: Settings */}
              <h2 id="manual-settings">7. Settings</h2>

              <h3>General Settings</h3>
              <ul>
                <li><strong>Default Betting Time</strong> — countdown duration for new rounds (5–60 seconds)</li>
                <li><strong>Supported Currencies</strong> — comma-separated currency codes</li>
                <li><strong>Maintenance Mode</strong> — returns 503 for all non-internal endpoints</li>
              </ul>

              <h3>Payout Odds</h3>
              <p>Configure payout multipliers for each bet type (Banker, Player, Tie, pairs, side bets). Changes take effect on the next round.</p>

              <h3>Danger Zone</h3>
              <ul>
                <li><strong>Force-Close All Tables</strong> — immediately closes every active table and disconnects all players</li>
              </ul>
              <div className="warn">Force-closing tables should only be used in emergencies. Players in active rounds will have their bets refunded.</div>

              {/* Section 8: Monitoring */}
              <h2 id="manual-monitoring">8. Monitoring</h2>
              <p>The monitoring page shows system health:</p>
              <ul>
                <li><strong>Wallet Errors</strong> — failed debit/credit operations (24h and total)</li>
                <li><strong>WebSocket Connections</strong> — active real-time connections</li>
                <li><strong>API Errors</strong> — failed API requests in the last 24 hours</li>
                <li><strong>Error Log</strong> — detailed wallet error log with operation type, HTTP status, and retry count</li>
              </ul>
              <div className="tip">If wallet errors spike, check the operator&apos;s wallet URL and ensure their service is responsive.</div>

              {/* Section 9: Studio Guide */}
              <h2 id="manual-studio">9. Studio Dealer Guide</h2>
              <p>The studio interface is used by dealers to run live baccarat games.</p>

              <h3>Starting a Shift</h3>
              <ol>
                <li>Open Chrome on the studio PC</li>
                <li>Navigate to the studio URL and log in</li>
                <li>Open Settings — set dealer name and select table</li>
                <li>Connect the Angel Eye shoe (serial port)</li>
                <li>Start the video stream in OBS</li>
              </ol>

              <h3>Dealing Rounds</h3>
              <ol>
                <li>Click <strong>NEW ROUND</strong> — betting countdown starts</li>
                <li>Wait for countdown to finish — &quot;NO MORE BETS&quot;</li>
                <li>Deal cards through the Angel Eye shoe</li>
                <li>Result is automatic — bets settle, roads update</li>
                <li>Click <strong>NEW ROUND</strong> again</li>
              </ol>

              <h3>Manual Input</h3>
              <p>If the shoe malfunctions, use the Manual Input button to enter cards by hand. The system enforces baccarat third-card rules.</p>

              {/* Section 10: Player UI */}
              <h2 id="manual-player-ui">10. Player UI</h2>
              <p>The player UI is an iframe-embeddable game interface that operators embed in their casino platforms.</p>

              <h3>How It Works</h3>
              <ul>
                <li>Operators launch the game via the <strong>Authentication API</strong>, which returns a game URL with a session token</li>
                <li>Players see a live video stream, betting interface, roads (bead, big road, derived roads), and bet history</li>
                <li>Bets are placed during the countdown, settled automatically after cards are dealt</li>
                <li>Balance syncs with the operator&apos;s wallet in real-time</li>
              </ul>

              <h3>Demo Mode</h3>
              <p>Access <code>/play/demo</code> to test the player UI without authentication. Uses a mock wallet with a demo balance.</p>

              {/* Section 11: Emulator */}
              <h2 id="manual-emulator">11. Emulator</h2>
              <p>The emulator replaces the Angel Eye shoe for testing. Use it when no physical hardware is available.</p>

              <h3>Testing Flow</h3>
              <ol>
                <li>Open Studio in one tab, Emulator (<code>/emulator</code>) in another</li>
                <li>Studio: click <strong>New Round</strong></li>
                <li>Player UI: place bets during countdown</li>
                <li>Emulator: click <strong>Deal Cards</strong> — random or specific cards</li>
                <li>Result settles automatically across all connected clients</li>
              </ol>
              <div className="tip">The emulator is the fastest way to test the full round lifecycle — studio, player bets, dealing, settlement — without any hardware.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
