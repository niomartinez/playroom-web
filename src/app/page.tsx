import Link from "next/link";

/** Root page — redirects or shows a launcher. */
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8">
      <h1 className="text-4xl font-bold text-[var(--gold)]">
        Play Room Gaming
      </h1>
      <p className="text-[var(--text-gray)]">Live Baccarat</p>
      <div className="flex gap-4">
        <Link
          href="/play"
          className="px-6 py-3 bg-[var(--player-blue)] rounded-lg font-semibold hover:opacity-90 transition"
        >
          Player UI
        </Link>
        <Link
          href="/studio"
          className="px-6 py-3 bg-[var(--bg-panel)] border border-[var(--gold-dim)] rounded-lg font-semibold hover:border-[var(--gold)] transition"
        >
          Studio
        </Link>
      </div>
    </main>
  );
}
