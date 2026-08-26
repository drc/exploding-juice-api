export interface OpenDotaHero {
  id: number;
  localized_name: string;
}

export interface OpenDotaPlayer {
  account_id?: number | null;
  personaname?: string | null;
  player_slot: number;
  hero_id: number;
  kills: number;
  deaths: number;
  assists: number;
}

export interface OpenDotaMatch {
  match_id: number;
  start_time: number;
  duration: number;
  radiant_win: boolean;
  radiant_score: number;
  dire_score: number;
  version?: number | null;
  players: OpenDotaPlayer[];
  od_data?: {
    has_api?: boolean;
    has_gcdata?: boolean;
    has_parsed?: boolean;
    has_archive?: boolean;
  };
}
