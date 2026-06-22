import { execSync } from "child_process";
import env from "@/env";
import type { ClickHouseRawResponse } from "@/types/dota";

/**
 * Resolve credential value: if it looks like a shell command, execute it; otherwise use as-is
 */
function resolveCredential(value: string | undefined): string {
  if (!value) return "";

  // Check if value looks like a shell command: $(...)
  const shellCmdMatch = value.match(/^\$\((.*)\)$/);
  if (shellCmdMatch) {
    try {
      const cmd = shellCmdMatch[1];
      const result = execSync(cmd, { encoding: "utf-8" }).trim();
      return result;
    } catch (error) {
      console.error(`Failed to execute credential command: ${value}`, error);
      return "";
    }
  }

  return value;
}

function escapeSqlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

// Read credentials
const CLICKHOUSE_URL = env.CLICKHOUSE_URL;
const CLICKHOUSE_USER = env.CLICKHOUSE_USER;
const CLICKHOUSE_PASSWORD = resolveCredential(env.CLICKHOUSE_PASSWORD);

// Write credentials (optional)
const CLICKHOUSE_WRITE_URL = env.CLICKHOUSE_WRITE_URL || CLICKHOUSE_URL;
const CLICKHOUSE_WRITE_USER = env.CLICKHOUSE_WRITE_USER || CLICKHOUSE_USER;
const CLICKHOUSE_WRITE_PASSWORD = resolveCredential(env.CLICKHOUSE_WRITE_PASSWORD);
const CLICKHOUSE_WRITE_DATABASE = env.CLICKHOUSE_WRITE_DATABASE;
const CLICKHOUSE_WRITE_TABLE = env.CLICKHOUSE_WRITE_TABLE;
const ENABLE_PERSISTENCE = env.ENABLE_PERSISTENCE === "true";

// Query to get weekly wrapped stats
const WEEKLY_WRAPPED_QUERY = `
WITH match_stats AS (
  SELECT
    account_id,
    match_id,
    MAX(IF(event_key = 'player.kills', event_value, 0)) as match_kills,
    MAX(IF(event_key = 'player.deaths', event_value, 0)) as match_deaths,
    MAX(IF(event_key = 'player.assists', event_value, 0)) as match_assists,
    MAX(IF(event_key = 'player.kill_streak', event_value, 0)) as match_max_streak,
    MAX(IF(event_key = 'player.gpm', event_value, 0)) as match_gpm,
    MAX(IF(event_key = 'player.xpm', event_value, 0)) as match_xpm,
    MAX(IF(event_key = 'player.last_hits', event_value, 0)) as match_last_hits,
    MAX(IF(event_key = 'player.gold', event_value, 0)) as match_final_gold,
    MAX(IF(event_key = 'hero.level', event_value, 0)) as match_final_level,
    MAX(game_time) as match_duration_ms
  FROM dota_events
  WHERE 
    account_id = {account_id:UInt64}
    AND toStartOfWeek(timestamp) = toStartOfWeek(toDate('{week_start_date:String}'))
  GROUP BY account_id, match_id
),

tier1_data AS (
  SELECT
    COUNT(*) as matches_played,
    SUM(match_kills) as total_kills,
    SUM(match_deaths) as total_deaths,
    SUM(match_assists) as total_assists,
    MAX(match_kills) as best_kill_game,
    MAX(match_max_streak) as longest_kill_streak,
    ROUND(AVG(match_gpm), 2) as avg_gpm,
    ROUND(AVG(match_xpm), 2) as avg_xpm,
    ROUND(AVG(match_last_hits), 2) as avg_last_hits,
    ROUND(
      CASE 
        WHEN SUM(match_deaths) = 0 THEN CAST(SUM(match_kills) + SUM(match_assists) AS Float64)
        ELSE (SUM(match_kills) + SUM(match_assists)) / CAST(SUM(match_deaths) AS Float64)
      END,
      2
    ) as kda_ratio
  FROM match_stats
),

tier2_data AS (
  SELECT
    ROUND(AVG(match_duration_ms / 60.0), 2) as avg_match_duration_min,
    ROUND(AVG(match_final_level), 2) as avg_final_level,
    ROUND(SUM(match_final_gold), 2) as total_gold_earned,
    CASE
      WHEN SUM(match_kills) = 0 THEN 0
      ELSE ROUND(SUM(match_final_gold) / SUM(match_kills), 2)
    END as gold_per_kill,
    CASE
      WHEN COUNT(*) < 2 THEN 1.0
      ELSE ROUND(LEAST(1.0, 1.0 - (stddevSamp(match_kills - match_deaths) / (AVG(match_kills) + 0.1))), 2)
    END as consistency_score,
    CASE
      WHEN AVG(match_gpm) > 700 AND AVG(match_last_hits) > 60 THEN 'Core Carry'
      WHEN AVG(match_gpm) > 600 AND AVG(match_last_hits) > 50 THEN 'Mid Laner'
      WHEN (SUM(match_assists) / COUNT(*)) > 20 AND AVG(match_gpm) < 500 THEN 'Support'
      ELSE 'Offlane'
    END as role_detected
  FROM match_stats
),

streak_data AS (
  SELECT
    MAX(match_max_streak) as max_streak,
    SUM(IF(match_max_streak >= 5, 1, 0)) as streaks_over_5,
    SUM(IF(match_max_streak >= 10, 1, 0)) as streaks_over_10,
    SUM(IF(match_kills >= match_deaths + 5, 1, 0)) as comeback_count
  FROM match_stats
),

item_data AS (
  SELECT
    groupArray(item_slot) as item_slots,
    groupArray(frequency) as item_frequencies
  FROM (
    SELECT
      replaceRegexpAll(event_key, '^items\\\\.slot([0-9]+)\\\\.item_level$', 'slot\\\\1') as item_slot,
      COUNT(*) as frequency
    FROM dota_events
    WHERE 
      account_id = {account_id:UInt64}
      AND toStartOfWeek(timestamp) = toStartOfWeek(toDate('{week_start_date:String}'))
      AND event_key LIKE 'items.slot%.item_level'
      AND event_value > 0
    GROUP BY item_slot
    ORDER BY frequency DESC
    LIMIT 10
  )
),

peer_group_data AS (
  SELECT
    account_id,
    COUNT(DISTINCT match_id) as peer_matches,
    ROUND(AVG(IF(event_key = 'player.gpm', event_value, NULL)), 2) as peer_avg_gpm,
    SUM(IF(event_key = 'player.kills', event_value, 0)) as peer_total_kills
  FROM dota_events
  WHERE toStartOfWeek(timestamp) = toStartOfWeek(toDate('{week_start_date:String}'))
  GROUP BY account_id
),

player_ranking AS (
  SELECT
    CAST(
      countIf(peer_matches <= (
        SELECT peer_matches FROM peer_group_data WHERE account_id = {account_id:UInt64}
      )) * 100.0 / COUNT(*) 
      AS UInt32
    ) as matches_percentile,
    CAST(
      countIf(peer_total_kills <= (
        SELECT peer_total_kills FROM peer_group_data WHERE account_id = {account_id:UInt64}
      )) * 100.0 / COUNT(*) 
      AS UInt32
    ) as kills_percentile,
    CAST(
      countIf(peer_avg_gpm <= (
        SELECT peer_avg_gpm FROM peer_group_data WHERE account_id = {account_id:UInt64}
      )) * 100.0 / COUNT(*) 
      AS UInt32
    ) as gpm_percentile
  FROM peer_group_data
)

SELECT
  {account_id:UInt64} as account_id,
  toStartOfWeek(toDate('{week_start_date:String}')) as week_start,
  toStartOfWeek(toDate('{week_start_date:String}')) + 6 as week_end,
  
  t1.matches_played,
  t1.total_kills,
  t1.total_deaths,
  t1.total_assists,
  t1.best_kill_game,
  t1.longest_kill_streak,
  t1.avg_gpm,
  t1.avg_xpm,
  t1.avg_last_hits,
  t1.kda_ratio,
  
  t2.avg_match_duration_min,
  t2.avg_final_level,
  t2.consistency_score,
  t2.role_detected,
  t2.total_gold_earned,
  t2.gold_per_kill,
  
  s.max_streak,
  s.streaks_over_5,
  s.streaks_over_10,
  s.comeback_count,
  
  i.item_slots,
  i.item_frequencies,
  
  pr.matches_percentile,
  pr.kills_percentile,
  pr.gpm_percentile

FROM tier1_data t1
CROSS JOIN tier2_data t2
CROSS JOIN streak_data s
CROSS JOIN item_data i
CROSS JOIN player_ranking pr
LIMIT 1
FORMAT JSON
`;

export class ClickHouseClient {
  /**
   * Query weekly wrapped stats for a player
   */
  static async getWeeklyWrapped(
    accountId: number,
    weekStartDate: string,
  ): Promise<ClickHouseRawResponse> {
    try {
      // Build the query by substituting parameters
      const safeWeekStart = escapeSqlString(weekStartDate);
      const query = WEEKLY_WRAPPED_QUERY.replace(
        /{account_id:UInt64}/g,
        accountId.toString(),
      ).replace(/{week_start_date:String}/g, safeWeekStart);

      // Build auth header
      const authHeader = `Basic ${Buffer.from(`${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}`).toString("base64")}`;

      const response = await fetch(CLICKHOUSE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: authHeader,
        },
        body: query,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClickHouse error (${response.status}): ${errorText}`);
      }

      // Parse the JSON response from ClickHouse
      const jsonResponse = (await response.json()) as {
        data?: Array<Record<string, any>>;
      };

      if (!jsonResponse.data || jsonResponse.data.length === 0) {
        throw new Error("Empty response from ClickHouse");
      }

      const row = jsonResponse.data[0];

      // Map ClickHouse JSON response to ClickHouseRawResponse
      const rawResponse: ClickHouseRawResponse = {
        account_id: row.account_id,
        week_start: row.week_start,
        week_end: row.week_end,

        // Tier 1
        matches_played: row.matches_played,
        total_kills: row.total_kills,
        total_deaths: row.total_deaths,
        total_assists: row.total_assists,
        best_kill_game: row.best_kill_game,
        longest_kill_streak: row.longest_kill_streak,
        avg_gpm: row.avg_gpm,
        avg_xpm: row.avg_xpm,
        avg_last_hits: row.avg_last_hits,
        kda_ratio: row.kda_ratio,

        // Tier 2
        avg_match_duration_min: row.avg_match_duration_min,
        avg_final_level: row.avg_final_level,
        consistency_score: row.consistency_score,
        role_detected: row.role_detected,
        total_gold_earned: row.total_gold_earned,
        gold_per_kill: row.gold_per_kill,

        // Tier 3: Streaks
        max_streak: row.max_streak,
        streaks_over_5: row.streaks_over_5,
        streaks_over_10: row.streaks_over_10,
        comeback_count: row.comeback_count,

        // Tier 3: Items (already JSON arrays from ClickHouse)
        item_slots: row.item_slots,
        item_frequencies: row.item_frequencies,

        // Peer rankings
        matches_percentile: row.matches_percentile,
        kills_percentile: row.kills_percentile,
        gpm_percentile: row.gpm_percentile,
      };

      return rawResponse;
    } catch (error) {
      if (error instanceof Error) {
        console.error("ClickHouse error:", error.message);
        throw new Error(`ClickHouse query failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get all peer stats for a given week (for percentile calculation)
   */
  static async getPeerStats(weekStartDate: string) {
    try {
      const safeWeekStart = escapeSqlString(weekStartDate);
      const query = `
SELECT
  account_id,
  COUNT(DISTINCT match_id) as peer_matches,
  ROUND(AVG(IF(event_key = 'player.gpm', event_value, NULL)), 2) as peer_avg_gpm,
  SUM(IF(event_key = 'player.kills', event_value, 0)) as peer_total_kills
FROM dota_events
WHERE toStartOfWeek(timestamp) = toStartOfWeek(toDate('${safeWeekStart}'))
GROUP BY account_id
ORDER BY account_id
FORMAT JSONEachRow
`;

      // Build auth header
      const authHeader = `Basic ${Buffer.from(`${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}`).toString("base64")}`;

      const response = await fetch(CLICKHOUSE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: authHeader,
        },
        body: query,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClickHouse error (${response.status}): ${errorText}`);
      }

      // Parse JSONL response
      const text = await response.text();
      const lines = text.trim().split("\n");
      return lines.map((line: string) => JSON.parse(line));
    } catch (error) {
      console.error("Failed to fetch peer stats:", error);
      throw error;
    }
  }

  /**
   * Save weekly wrapped response to ClickHouse for future querying
   * Optional: only runs if ENABLE_PERSISTENCE=true and write credentials configured
   */
  static async persistWrappedData(
    accountId: number,
    weekStartDate: string,
    weekEndDate: string,
    data: ClickHouseRawResponse,
  ): Promise<void> {
    if (!ENABLE_PERSISTENCE) {
      return; // Persistence disabled
    }

    try {
      const safeDb = escapeSqlString(CLICKHOUSE_WRITE_DATABASE);
      const safeTable = escapeSqlString(CLICKHOUSE_WRITE_TABLE);
      const query = `
INSERT INTO ${safeDb}.${safeTable} (
  account_id,
  week_start_date,
  week_end_date,
  created_at,
  matches_played,
  total_kills,
  total_deaths,
  total_assists,
  best_kill_game,
  longest_kill_streak,
  avg_gpm,
  avg_xpm,
  avg_last_hits,
  kda_ratio,
  avg_match_duration_min,
  avg_final_level,
  consistency_score,
  role_detected,
  total_gold_earned,
  gold_per_kill,
  max_streak,
  streaks_over_5,
  streaks_over_10,
  comeback_count,
  item_slots,
  item_frequencies,
  matches_percentile,
  kills_percentile,
  gpm_percentile
)
VALUES (
  ${data.account_id},
  '${escapeSqlString(data.week_start)}',
  '${escapeSqlString(data.week_end)}',
  now(),
  ${data.matches_played},
  ${data.total_kills},
  ${data.total_deaths},
  ${data.total_assists},
  ${data.best_kill_game},
  ${data.longest_kill_streak},
  ${data.avg_gpm},
  ${data.avg_xpm},
  ${data.avg_last_hits},
  ${data.kda_ratio},
  ${data.avg_match_duration_min},
  ${data.avg_final_level},
  ${data.consistency_score},
  '${escapeSqlString(data.role_detected)}',
  ${data.total_gold_earned},
  ${data.gold_per_kill},
  ${data.max_streak},
  ${data.streaks_over_5},
  ${data.streaks_over_10},
  ${data.comeback_count},
  [${data.item_slots.map((s) => `'${escapeSqlString(s)}'`).join(",")}],
  [${data.item_frequencies.join(",")}],
  ${data.matches_percentile},
  ${data.kills_percentile},
  ${data.gpm_percentile}
)
`;

      // Build auth header if credentials provided
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (CLICKHOUSE_WRITE_USER && CLICKHOUSE_WRITE_PASSWORD) {
        const auth = Buffer.from(`${CLICKHOUSE_WRITE_USER}:${CLICKHOUSE_WRITE_PASSWORD}`).toString(
          "base64",
        );
        headers["Authorization"] = `Basic ${auth}`;
      }

      const response = await fetch(CLICKHOUSE_WRITE_URL, {
        method: "POST",
        headers,
        body: query,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ClickHouse persistence error (${response.status}): ${errorText}`);
      }

      console.log(`✓ Persisted wrapped data for account ${accountId} week ${data.week_start}`);
    } catch (error) {
      console.error(`Failed to persist wrapped data for account ${accountId}:`, error);
      // Don't throw - persistence failure shouldn't break the API
    }
  }
}
