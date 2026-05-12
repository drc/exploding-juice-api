import type {
  Tier1Stats,
  Tier2Stats,
  Tier3Stats,
  Tier4Stats,
  PersonalityBadge,
  GameAnomaly,
  ClickHouseRawResponse,
} from "@/types/dota";

export class WrappedLogic {
  /**
   * Detect personality badge based on player stats
   */
  static detectPersonalityBadge(stats: Tier1Stats & Tier2Stats): PersonalityBadge {
    // Farming Machine: High GPM + high last hits
    if (stats.avg_gpm > 700 && stats.avg_last_hits > 60) {
      return "Farming Machine";
    }

    // Teamfight Warrior: High assists, low deaths
    const assistsPerMatch =
      stats.total_assists / Math.max(1, stats.total_kills + stats.total_deaths);
    const deathsPerMatch = stats.total_deaths / Math.max(1, stats.matches_played);
    if (assistsPerMatch > 1.5 && deathsPerMatch < 5) {
      return "Teamfight Warrior";
    }

    // Roaming Ganker: High XPM + high kill streaks
    if (stats.avg_xpm > 1100 && stats.longest_kill_streak >= 15) {
      return "Roaming Ganker";
    }

    // Consistent Performer: Low variance in K/D ratio
    if (stats.consistency_score > 0.7) {
      return "Consistent Performer";
    }

    // Default: Clutch Player (high variance)
    return "Clutch Player";
  }

  /**
   * Find anomalous "That One Game"
   * This is a simplified version that looks for extreme stats
   */
  static async findThatOneGame(
    _accountId: number,
    _weekStartDate: string,
  ): Promise<GameAnomaly | null> {
    // In a full implementation, this would query all matches for the player
    // For now, return null (will be enhanced with match-level queries)
    // This is intentionally left simple for v1

    // Example anomaly detection logic:
    // - Most kills but also high deaths
    // - High GPM but low CS
    // - Won with low damage (as support)

    return null;
  }

  /**
   * Generate human-readable anomaly description
   */
  static generateAnomalyText(kills: number, deaths: number, gpm: number, lastHits: number): string {
    const anomalies: string[] = [];

    if (kills > 50 && deaths > 40) {
      anomalies.push("absolute bloodbath");
    } else if (kills > 100 && deaths > 30) {
      anomalies.push("absolutely dominating despite some deaths");
    }

    if (gpm > 1500 && lastHits < 50) {
      anomalies.push("farming like crazy without last-hitting");
    }

    if (kills < 10 && gpm > 800) {
      anomalies.push("farming simulator");
    }

    if (deaths > 20 && kills < 20) {
      anomalies.push("getting absolutely stomped");
    }

    if (anomalies.length > 0) {
      return `That was an ${anomalies[0]} of a game!`;
    }

    return "Pretty standard game!";
  }

  /**
   * Generate Tier 4 stats from raw ClickHouse data
   */
  static generateTier4Stats(raw: ClickHouseRawResponse): Tier4Stats {
    // Combine Tier1 and Tier2 for badge detection
    const tier1 = this.extractTier1(raw);
    const tier2 = this.extractTier2(raw);
    const combinedStats = { ...tier1, ...tier2 };

    const personalityBadge = this.detectPersonalityBadge(combinedStats);

    // Generate anomaly text (simplified version)
    const anomalyText = this.generateAnomalyText(
      raw.total_kills,
      raw.total_deaths,
      raw.avg_gpm,
      raw.avg_last_hits,
    );

    // Skill shots: simplified calculation
    // Count as number of matches with high kill streaks
    const skillShotsLanded = Math.min(
      raw.streaks_over_5 * 5 + raw.comeback_count * 3,
      raw.matches_played * 10,
    );

    return {
      personality_badge: personalityBadge,
      that_one_game:
        raw.total_kills > 0
          ? {
              match_id: Math.floor(Math.random() * 1000000000), // Placeholder
              anomaly: anomalyText,
            }
          : null,
      peer_comparison: {
        matches_percentile: raw.matches_percentile,
        kills_percentile: raw.kills_percentile,
        gpm_percentile: raw.gpm_percentile,
      },
      skill_shots_landed: Math.floor(skillShotsLanded),
    };
  }

  /**
   * Extract Tier 1 stats from raw response
   */
  static extractTier1(raw: ClickHouseRawResponse): Tier1Stats {
    return {
      matches_played: raw.matches_played,
      total_kills: raw.total_kills,
      total_deaths: raw.total_deaths,
      total_assists: raw.total_assists,
      best_kill_game: raw.best_kill_game,
      longest_kill_streak: raw.longest_kill_streak,
      avg_gpm: raw.avg_gpm,
      avg_xpm: raw.avg_xpm,
      avg_last_hits: raw.avg_last_hits,
      kda_ratio: raw.kda_ratio,
    };
  }

  /**
   * Extract Tier 2 stats from raw response
   */
  static extractTier2(raw: ClickHouseRawResponse): Tier2Stats {
    return {
      avg_match_duration_min: raw.avg_match_duration_min,
      avg_final_level: raw.avg_final_level,
      consistency_score: raw.consistency_score,
      role_detected: raw.role_detected,
      total_gold_earned: raw.total_gold_earned,
      gold_per_kill: raw.gold_per_kill,
    };
  }

  /**
   * Extract Tier 3 stats from raw response
   */
  static extractTier3(raw: ClickHouseRawResponse): Tier3Stats {
    return {
      streak_analytics: {
        max_streak: raw.max_streak,
        streaks_over_5: raw.streaks_over_5,
        streaks_over_10: raw.streaks_over_10,
        comeback_count: raw.comeback_count,
      },
      top_items: raw.item_slots.map((slot, idx) => ({
        slot,
        frequency: raw.item_frequencies[idx] || 0,
      })),
    };
  }

  /**
   * Validate account ID
   */
  static validateAccountId(accountId: unknown): accountId is number {
    return typeof accountId === "number" && accountId > 0 && Number.isInteger(accountId);
  }

  /**
   * Validate week start date (YYYY-MM-DD format)
   */
  static validateWeekStartDate(date: unknown): date is string {
    if (typeof date !== "string") return false;

    // Check YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;

    // Verify it's a valid date
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }

  /**
   * Calculate week boundaries from start date
   * Input: any date, output: Monday-Sunday of that week
   */
  static calculateWeekBounds(dateStr: string): { start: Date; end: Date } {
    const date = new Date(dateStr);
    const day = date.getUTCDay();

    // Calculate days to subtract to get to Monday (day 1)
    const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);

    const monday = new Date(date.setUTCDate(diff));
    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);

    return {
      start: monday,
      end: sunday,
    };
  }

  /**
   * Format date as YYYY-MM-DD
   */
  static formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }
}
