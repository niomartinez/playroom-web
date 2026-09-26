export interface AdminBet extends Record<string, unknown> {
  id: string;
  external_bet_id: string | null;
  fight_id: string | null;
  external_fight_id: string | null;
  player_username: string | null;
  player_display_name: string | null;
  player_external_id: string | null;
  site_code: string | null;
  site_label: string;
  game_name: string | null;
  external_game_id: string | null;
  bet_code: string | null;
  team: string;
  bet_amount: number | string;
  odds: number | string | null;
  payoff: number | string | null;
  status: string;
  created_at: string;
  settled_at: string | null;
  voided_at: string | null;
}

export interface BetLogResponse {
  bets: AdminBet[];
  total: number;
  page: number;
  page_size: number;
}

export const BET_FILTER_KEYS = ["bet_id", "player", "site", "game_id", "status", "date_from", "date_to"] as const;
export type BetLogFilters = Record<(typeof BET_FILTER_KEYS)[number], string>;
export const EMPTY_BET_FILTERS: BetLogFilters = {
  bet_id: "", player: "", site: "", game_id: "", status: "", date_from: "", date_to: "",
};

/** Listing and CSV share exactly these filters; pagination is list-only. */
export function betLogParams(filters: BetLogFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of BET_FILTER_KEYS) if (filters[key].trim()) params.set(key, filters[key].trim());
  return params;
}
