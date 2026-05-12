import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "http-status-codes";
import {
	playerSearchResponseSchema,
	playerSearchQuerySchema,
	weeklyWrappedResponseSchema,
	weeklyWrappedQuerySchema,
	errorResponseSchema,
} from "./players.schema";

const tags = ["Dota 2"];

export const searchPlayers = createRoute({
	method: "get",
	path: "/players/search",
	request: {
		query: playerSearchQuerySchema,
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: playerSearchResponseSchema,
				},
			},
			description: "Player search results",
		},
		400: {
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
			description: "Invalid query parameters",
		},
		503: {
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
			description: "ClickHouse unavailable",
		},
	},
	summary: "Search players by username for Discord bot autocomplete",
	tags,
});

export const getWeeklyWrapped = createRoute({
	method: "get",
	path: "/players/wrapped/{accountId}",
	request: {
		params: z.object({
			accountId: z.string().regex(/^\d+$/).openapi({
				description: "Steam Account ID (UInt64)",
				examples: ["83730627"],
			}),
		}),
		query: weeklyWrappedQuerySchema,
	},
	responses: {
		200: {
			content: {
				"application/json": {
					schema: weeklyWrappedResponseSchema,
				},
			},
			description: "Weekly wrapped metrics for the player",
		},
		400: {
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
			description: "Invalid account ID or date format",
		},
		404: {
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
			description: "No data found for player/week",
		},
		503: {
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
			description: "ClickHouse unreachable",
		},
		500: {
			content: {
				"application/json": {
					schema: errorResponseSchema,
				},
			},
			description: "Internal server error",
		},
	},
	summary: "Get weekly wrapped metrics for a player",
	tags,
});

export type SearchPlayersRoute = typeof searchPlayers;
export type GetWeeklyWrappedRoute = typeof getWeeklyWrapped;
