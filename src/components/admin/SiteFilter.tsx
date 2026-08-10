"use client";

import { useAdminQuery } from "@/lib/admin-query";

export interface SiteOption {
  site_code: string | null;
  site_label: string;
  registered_players: number;
}

interface SitesResponse {
  sites?: SiteOption[];
  total?: number;
}

interface SiteFilterProps {
  value: string;
  onChange: (site: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

/* Site is DERIVED from the first three characters of the player's username —
   the prefix OCMS's downstream sites use. It is not a field they send us:
   OCMS integrates as one agent and transmits no site identifier anywhere. So
   the control says so. Presented as authoritative, a mis-bucketed new site
   would read as fact rather than as the heuristic it is. */
export const SITE_HINT =
  "Derived from the first 3 characters of the player's username (the OCMS site prefix) — not a field OCMS sends us";

export default function SiteFilter({
  value,
  onChange,
  className,
  style,
}: SiteFilterProps) {
  const { data } = useAdminQuery<SitesResponse>("/api/admin/sites");
  const sites = data?.sites ?? [];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      title={SITE_HINT}
      aria-label="Filter by site"
      className={className}
      style={style}
    >
      <option value="">All sites</option>
      {sites.map((s) => (
        /* The Unassigned bucket has no code, so it travels as the literal
           "unassigned" — NULL cannot ride in a query string. */
        <option
          key={s.site_code ?? "unassigned"}
          value={s.site_code ?? "unassigned"}
        >
          {s.site_label} ({s.registered_players})
        </option>
      ))}
    </select>
  );
}
