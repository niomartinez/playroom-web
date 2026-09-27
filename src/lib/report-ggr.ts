type SiteGgr = { site_code: string | null; ggr: number };

/** Combined report GGR: floor each site's whole-period result before summing.
 * Keep signed row values intact. Never floor per bet, day, provider or table.
 */
export function combinedSiteGgr(
  sites: readonly SiteGgr[] | undefined,
  site?: string,
): number | null {
  if (!sites) return null;
  const selected = site
    ? sites.filter((row) => site === "unassigned" ? row.site_code == null : row.site_code === site)
    : sites;
  return selected.reduce((cents, row) => cents + Math.max(0, Math.round(row.ggr * 100)), 0) / 100;
}
