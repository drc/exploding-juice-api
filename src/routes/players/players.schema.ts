import { z } from "@hono/zod-openapi";
import type { WeeklyWrappedResponse } from "@/types/dota";

// Player search query parameters
export const playerSearchQuerySchema = z.object({
	query: z.string().min(1).max(100).openapi({
		description: "Search term for player username (case-insensitive, partial match)",
		examples: ["r0man", "rain", "0man"],
	}),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(50)
		.default(10)
		.openapi({
			description: "Maximum number of results to return",
			examples: [10, 25, 50],
		}),
});

// Player search result
export const playerSearchResultSchema = z.object({
	id: z.number().int().openapi({
		description: "Steam Account ID (UInt64)",
		examples: [83730627],
	}),
	username: z.string().openapi({
		description: "Player display name",
		examples: ["r0man_Ra1ns"],
	}),
	created_at: z.string().openapi({
		description: "Account creation timestamp",
		examples: ["2026-03-21 21:03:16"],
	}),
});

// Player search response
export const playerSearchResponseSchema = z.object({
	results: z.array(playerSearchResultSchema).openapi({
		description: "Array of matching players",
	}),
	total: z.number().int().openapi({
		description: "Total number of results",
		examples: [1, 5, 10],
	}),
});

// Weekly wrapped query parameters
export const weeklyWrappedQuerySchema = z.object({
	week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().openapi({
		description: "Week start date in YYYY-MM-DD format. Defaults to current week.",
		examples: ["2026-04-28", "2026-05-05"],
	}),
});

// Weekly wrapped response (from dota types)
const tier1Schema = z.object({
	matches_played: z.number(),
	total_kills: z.number(),
	total_deaths: z.number(),
	total_assists: z.number(),
	best_kill_game: z.number(),
	longest_kill_streak: z.number(),
	avg_gpm: z.number(),
	avg_xpm: z.number(),
	avg_last_hits: z.number(),
	kda_ratio: z.number(),
});

const tier2Schema = z.object({
	avg_match_duration_min: z.number(),
	avg_final_level: z.number(),
	consistency_score: z.number(),
	role_detected: z.string(),
	total_gold_earned: z.number(),
	gold_per_kill: z.number(),
});

const tier3Schema = z.object({
	streak_analytics: z.object({
		max_streak: z.number(),
		streaks_over_5: z.number(),
		streaks_over_10: z.number(),
		comeback_count: z.number(),
	}),
	top_items: z.array(
		z.object({
			slot: z.string(),
			frequency: z.number(),
		}),
	),
});

const tier4Schema = z.object({
	personality_badge: z.string(),
	that_one_game: z
		.object({
			match_id: z.number(),
			anomaly: z.string(),
		})
		.nullable(),
	peer_comparison: z.object({
		matches_percentile: z.number(),
		kills_percentile: z.number(),
		gpm_percentile: z.number(),
	}),
	skill_shots_landed: z.number(),
});

export const weeklyWrappedResponseSchema = z.object({
	week: z.object({
		start_date: z.string(),
		end_date: z.string(),
	}),
	player: z.object({
		account_id: z.number().int(),
		stats: z.object({
			tier1: tier1Schema,
			tier2: tier2Schema,
			tier3: tier3Schema,
			tier4: tier4Schema,
		}),
	}),
});

// Error response
export const errorResponseSchema = z.object({
	message: z.string(),
	stack: z.string().optional(),
});
