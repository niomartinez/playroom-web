import Link from "next/link";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import LinkSpinner from "@/components/admin/ui/LinkSpinner";
import OcmsPlayersSearch from "@/components/admin/OcmsPlayersSearch";
import { getPlayers } from "@/lib/ocms-server";

const PAGE_SIZE = 20;

export default async function OcmsPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const sp = await searchParams;
  const search = sp.search ?? "";
  const page = Math.max(1, Number(sp.page) || 1);

  const { players, total } = await getPlayers({
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
  });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Preserve the active search when paging.
  function pageHref(p: number): string {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin-ocms/players?${qs}` : "/admin-ocms/players";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Players</h1>

      {/* Filter bar (search only — single operator, read-only) */}
      <OcmsPlayersSearch initialSearch={search} />

      {/* Results table (server-rendered) */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: "#171717",
          border: "1px solid rgba(208,135,0,0.2)",
        }}
      >
        {/* Header row */}
        <div
          className="grid grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.9fr] px-4 py-3 text-xs font-semibold uppercase tracking-wider"
          style={{
            color: "#d08700",
            borderBottom: "1px solid rgba(208,135,0,0.15)",
          }}
        >
          <span>Username</span>
          <span>External ID</span>
          <span>Balance</span>
          <span>Status</span>
          <span>Joined</span>
        </div>

        {players.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm" style={{ color: "#6a7282" }}>
            No players found
          </div>
        ) : (
          players.map((p) => (
            <Link
              key={p.id}
              href={`/admin-ocms/players/${p.id}`}
              className="grid grid-cols-[1.4fr_1.2fr_1fr_0.8fr_0.9fr] items-center px-4 py-3 text-sm transition-colors hover:bg-white/5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
            >
              <span className="text-white font-medium flex items-center gap-2">
                {p.username}
                <LinkSpinner />
              </span>
              <span className="font-mono text-xs" style={{ color: "#99a1af" }}>
                {p.external_user_id}
              </span>
              <span className="font-mono text-white">
                {Number(p.balance).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}{" "}
                <span style={{ color: "#6a7282" }}>{p.currency_code}</span>
              </span>
              <span>
                <StatusBadge status={p.is_active ? "active" : "inactive"} />
              </span>
              <span style={{ color: "#99a1af" }}>
                {p.created_at
                  ? new Date(p.created_at).toLocaleDateString()
                  : "—"}
              </span>
            </Link>
          ))
        )}
      </div>

      {/* Server-side pagination */}
      {totalPages > 1 && (
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "#6a7282" }}
        >
          <span>
            Page {page} of {totalPages} ({total} players)
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="flex items-center gap-1.5 rounded px-3 py-1 transition-colors hover:bg-white/5"
                style={{ color: "#99a1af" }}
              >
                <LinkSpinner /> Prev
              </Link>
            ) : (
              <span className="rounded px-3 py-1 opacity-30" style={{ color: "#99a1af" }}>
                Prev
              </span>
            )}
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="flex items-center gap-1.5 rounded px-3 py-1 transition-colors hover:bg-white/5"
                style={{ color: "#99a1af" }}
              >
                Next <LinkSpinner />
              </Link>
            ) : (
              <span className="rounded px-3 py-1 opacity-30" style={{ color: "#99a1af" }}>
                Next
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
