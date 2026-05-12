// TypeScript types for Dota 2 Weekly Wrapped API

// Tier 1: Core Performance Metrics
export interface Tier1Stats {
  matches_played: number;
  total_kills: number;
  total_deaths: number;
  total_assists: number;
  best_kill_game: number;
  longest_kill_streak: number;
  avg_gpm: number;
  avg_xpm: number;
  avg_last_hits: number;
  kda_ratio: number;
}

// Tier 2: Performance Insights
export interface Tier2Stats {
  avg_match_duration_min: number;
  avg_final_level: number;
  consistency_score: number;
  role_detected: string;
  total_gold_earned: number;
  gold_per_kill: number;
}

// Tier 3: Advanced Analytics
export interface Tier3Stats {
  streak_analytics: {
    max_streak: number;
    streaks_over_5: number;
    streaks_over_10: number;
    comeback_count: number;
  };
  top_items: Array<{
    slot: string;
    frequency: number;
  }>;
}

// Tier 4: Personality & Creative
export interface Tier4Stats {
  personality_badge: string;
  that_one_game: {
    match_id: number;
    anomaly: string;
  } | null;
  peer_comparison: {
    matches_percentile: number;
    kills_percentile: number;
    gpm_percentile: number;
  };
  skill_shots_landed: number;
}

// Complete Weekly Wrapped Response
export interface WeeklyWrappedResponse {
  week: {
    start_date: string;
    end_date: string;
  };
  player: {
    account_id: number;
    stats: {
      tier1: Tier1Stats;
      tier2: Tier2Stats;
      tier3: Tier3Stats;
      tier4: Tier4Stats;
    };
  };
}

// Raw ClickHouse response (before transformation)
export interface ClickHouseRawResponse {
  account_id: number;
  week_start: string;
  week_end: string;

  // Tier 1
  matches_played: number;
  total_kills: number;
  total_deaths: number;
  total_assists: number;
  best_kill_game: number;
  longest_kill_streak: number;
  avg_gpm: number;
  avg_xpm: number;
  avg_last_hits: number;
  kda_ratio: number;

  // Tier 2
  avg_match_duration_min: number;
  avg_final_level: number;
  consistency_score: number;
  role_detected: string;
  total_gold_earned: number;
  gold_per_kill: number;

  // Tier 3: Streaks
  max_streak: number;
  streaks_over_5: number;
  streaks_over_10: number;
  comeback_count: number;

  // Tier 3: Items
  item_slots: string[];
  item_frequencies: number[];

  // Peer rankings
  matches_percentile: number;
  kills_percentile: number;
  gpm_percentile: number;
}

// Personality badges
export type PersonalityBadge =
  | "Farming Machine"
  | "Teamfight Warrior"
  | "Roaming Ganker"
  | "Consistent Performer"
  | "Clutch Player";

// Match anomaly types
export interface GameAnomaly {
  match_id: number;
  anomaly: string;
}

// Request/Response types for API
export interface WeeklyWrappedRequest {
  account_id: number;
  week_start_date: string; // YYYY-MM-DD format
}

export interface WeeklyWrappedError {
  error: string;
  code: string;
  details?: Record<string, any>;
}
