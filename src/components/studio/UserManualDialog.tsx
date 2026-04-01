"use client";

interface UserManualDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Print the manual content — browser's Save as PDF works from the print dialog */
function handlePrint() {
  const content = document.getElementById("manual-content");
  if (!content) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><title>Studio Manual — Play Room Gaming</title>
    <style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;color:#222;line-height:1.7}
    h1{color:#b8860b;border-bottom:2px solid #b8860b;padding-bottom:8px}h3{color:#b8860b;margin-top:24px}
    table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:8px;border:1px solid #ddd;text-align:left}
    th{background:#f5f5f5;font-weight:600}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:13px}
    @media print{body{margin:0;padding:20px}}</style></head><body>
    <h1>Play Room Gaming — Studio Manual</h1>${content.innerHTML}</body></html>`);
  win.document.close();
  win.print();
}

export default function UserManualDialog({ open, onClose }: UserManualDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden"
        style={{
          width: "min(90vw, 800px)",
          height: "min(85vh, 700px)",
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
            <h2 className="font-bold text-white" style={{ fontSize: 18 }}>Studio User Manual</h2>
          </div>
          <div className="flex items-center gap-3">
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
              Print / Save PDF
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5" style={{ color: "#d1d5db" }}>
          <style>{`
            .manual h3 { color: #d08700; font-size: 16px; font-weight: 700; margin: 24px 0 12px; letter-spacing: 0.05em; }
            .manual h3:first-child { margin-top: 0; }
            .manual p { font-size: 14px; line-height: 1.7; margin: 0 0 12px; color: #d1d5db; }
            .manual ul, .manual ol { font-size: 14px; line-height: 1.7; margin: 0 0 12px; padding-left: 20px; color: #d1d5db; }
            .manual li { margin: 4px 0; }
            .manual code { background: rgba(208,135,0,0.1); color: #f0b100; padding: 2px 6px; border-radius: 4px; font-size: 13px; }
            .manual .step { display: flex; gap: 12px; margin: 8px 0; }
            .manual .step-num { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; background: rgba(208,135,0,0.2); color: #d08700; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
            .manual .step-text { font-size: 14px; color: #d1d5db; line-height: 1.6; padding-top: 3px; }
            .manual .warn { background: rgba(251,44,54,0.1); border: 1px solid rgba(251,44,54,0.3); border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #fb8080; margin: 12px 0; }
            .manual .info { background: rgba(5,223,114,0.08); border: 1px solid rgba(5,223,114,0.2); border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #7ddfb0; margin: 12px 0; }
            .manual table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
            .manual th { text-align: left; color: #d08700; padding: 8px; border-bottom: 1px solid rgba(208,135,0,0.2); font-weight: 600; }
            .manual td { padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #d1d5db; }
          `}</style>

          <div className="manual" id="manual-content">
            <h3>1. Setup (Per Shift)</h3>

            <div className="step"><span className="step-num">1</span><span className="step-text">Open <strong>Chrome</strong> on the Studio PC</span></div>
            <div className="step"><span className="step-num">2</span><span className="step-text">Navigate to the Studio URL and <strong>log in</strong> with your dealer credentials</span></div>
            <div className="step"><span className="step-num">3</span><span className="step-text">Open <strong>Settings</strong> (gear icon, top-right) — set your <strong>dealer name</strong> and select the <strong>table</strong></span></div>
            <div className="step"><span className="step-num">4</span><span className="step-text">In Settings, scroll to <strong>Angel Eye Shoe</strong> — click <strong>"Connect Shoe"</strong> and select the serial port</span></div>
            <div className="step"><span className="step-num">5</span><span className="step-text">Click <strong>Save</strong> — your name will appear in the player UI</span></div>
            <div className="step"><span className="step-num">6</span><span className="step-text">Open <strong>OBS Studio</strong> and start the camera stream</span></div>

            <div className="info">You only need to grant serial port permission once per session. If Chrome asks &quot;Allow this site to access a serial port?&quot; — click Allow.</div>

            <h3>2. Dealing a Round</h3>

            <div className="step"><span className="step-num">1</span><span className="step-text">Click <strong>"NEW ROUND"</strong> — betting opens, players see countdown timer</span></div>
            <div className="step"><span className="step-num">2</span><span className="step-text"><strong>Wait for countdown</strong> — DO NOT deal cards yet. Players are placing bets.</span></div>
            <div className="step"><span className="step-num">3</span><span className="step-text">Countdown hits 0 — <strong>"NO MORE BETS"</strong> appears. Bets are locked.</span></div>
            <div className="step"><span className="step-num">4</span><span className="step-text"><strong>Deal cards through the shoe</strong> — Player 1, Banker 1, Player 2, Banker 2, then third cards if rules require</span></div>
            <div className="step"><span className="step-num">5</span><span className="step-text"><strong>Result is automatic</strong> — shoe reads result, bets settle, roads update</span></div>
            <div className="step"><span className="step-num">6</span><span className="step-text">Click <strong>"NEW ROUND"</strong> again for the next round</span></div>

            <h3>3. Table Controls</h3>

            <table>
              <thead><tr><th>Button</th><th>When to Use</th><th>What Happens</th></tr></thead>
              <tbody>
                <tr><td><strong>NEW ROUND</strong></td><td>Start a new round</td><td>Opens betting, starts countdown</td></tr>
                <tr><td><strong>PAUSE TABLE</strong></td><td>Break, shift change</td><td>No new rounds. Current round finishes.</td></tr>
                <tr><td><strong>RESUME TABLE</strong></td><td>After pause</td><td>Table active again</td></tr>
                <tr><td><strong>CLOSE TABLE</strong></td><td>End of session</td><td>Players see "Table Closed"</td></tr>
              </tbody>
            </table>

            <h3>4. Betting Window</h3>
            <p>The betting window duration is configurable (10s, 15s, 20s, 25s, 30s). Use the buttons at the bottom of the Round Controls panel. Takes effect on the next round.</p>

            <h3>5. Manual Input (Fallback)</h3>
            <p>If the Angel Eye shoe malfunctions or a card isn&apos;t read correctly:</p>
            <ol>
              <li>Click the <strong>"Manual Input"</strong> button (bottom-right)</li>
              <li>Select cards manually using the card picker</li>
              <li>The system enforces baccarat third-card rules</li>
              <li>Submit to record the round</li>
            </ol>
            <div className="warn">Manual input should only be used when the shoe fails. Normal dealing should always go through the shoe.</div>

            <h3>6. Testing with Emulator (No Hardware)</h3>
            <p>When no physical shoe is available, use the Emulator page:</p>
            <ol>
              <li>Open <code>/emulator</code> in a separate tab</li>
              <li>Studio: click <strong>New Round</strong> — betting opens</li>
              <li>Player: places bets during countdown</li>
              <li>Emulator: click <strong>"Deal Cards"</strong> — cards dealt for the active round</li>
              <li>Result auto-settles, all clients return to waiting</li>
            </ol>

            <h3>7. Shift Change</h3>
            <ol>
              <li>Current dealer: Click <strong>PAUSE TABLE</strong> (wait for current round to finish)</li>
              <li>Current dealer: Log out</li>
              <li>New dealer: Log in → Connect Shoe → RESUME TABLE</li>
              <li>Click <strong>NEW ROUND</strong> to begin</li>
            </ol>

            <h3>8. Troubleshooting</h3>

            <table>
              <thead><tr><th>Issue</th><th>Solution</th></tr></thead>
              <tbody>
                <tr><td>Shoe shows "Disconnected"</td><td>Check USB cable. Click "Connect Shoe" and re-select port. Try different USB port.</td></tr>
                <tr><td>Wrong card read</td><td>Re-slide card. If persistent, use Manual Input for that round.</td></tr>
                <tr><td>"Browser Not Supported"</td><td>Use Chrome or Edge (not Safari/Firefox). Must be HTTPS.</td></tr>
                <tr><td>Video stream lag</td><td>Check upload bandwidth (need 15+ Mbps). Lower quality in OBS.</td></tr>
                <tr><td>Page frozen</td><td>Refresh (F5). Reconnect shoe. In-progress round is preserved on server.</td></tr>
              </tbody>
            </table>

            <h3>9. Emergency Procedures</h3>
            <p><strong>Power outage:</strong> All bets preserved in database. Log back in, reconnect shoe, resume table.</p>
            <p><strong>Internet disconnection:</strong> Players auto-reconnect. Video resumes. No bets lost.</p>
            <p><strong>Angel Eye failure:</strong> Switch to Manual Input for remaining rounds. Contact hardware support.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
