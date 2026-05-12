import { StatusCodes } from "http-status-codes";
import type { AppRouteHander } from "@/lib/types";
import { ClickHouseClient } from "@/services/clickhouse";
import { PlayerService } from "@/services/players";
import { WrappedLogic } from "@/services/wrapped";
import { responseCache } from "@/lib/cache";
import type { GetWeeklyWrappedRoute, SearchPlayersRoute } from "./players.routes";
import type { WeeklyWrappedResponse } from "@/types/dota";

export const searchPlayers: AppRouteHander<SearchPlayersRoute> = async (c) => {
	const { query, limit = 10 } = c.req.valid("query");

	// Call PlayerService.searchPlayers(query, limit)
	const results = await PlayerService.searchPlayers(query, limit);

	// Return {results, total}
	return c.json({ results, total: results.length }, StatusCodes.OK);
};

export const getWeeklyWrapped: AppRouteHander<GetWeeklyWrappedRoute> = async (c) => {
	const accountId = parseInt(c.req.param("accountId"), 10);
	const weekStartDateParam = c.req.query("week_start_date");

	// Validate accountId
	if (!WrappedLogic.validateAccountId(accountId)) {
		throw new Error(`Invalid account_id: ${accountId}`);
	}

	// Determine week_start_date
	let weekStartDate: string;
	if (weekStartDateParam) {
		if (!WrappedLogic.validateWeekStartDate(weekStartDateParam)) {
			throw new Error(`Invalid week_start_date format: ${weekStartDateParam}. Expected YYYY-MM-DD`);
		}
		weekStartDate = weekStartDateParam;
	} else {
		// Default to current week
		const today = new Date();
		const bounds = WrappedLogic.calculateWeekBounds(WrappedLogic.formatDate(today));
		weekStartDate = WrappedLogic.formatDate(bounds.start);
	}

	// Check cache
	const cacheKey = `${accountId}:${weekStartDate}`;
	const cached = responseCache.get(cacheKey);
	if (cached) {
		c.header("X-Cache", "HIT");
		return c.json(cached, StatusCodes.OK);
	}

	c.header("X-Cache", "MISS");

	// Query ClickHouse
	const rawData = await ClickHouseClient.getWeeklyWrapped(accountId, weekStartDate);

	// Check if we have data
	if (rawData.matches_played === 0) {
		throw new Error(`No data found for account ${accountId} in week ${weekStartDate}`);
	}

	// Transform response
	const response: WeeklyWrappedResponse = {
		week: {
			start_date: rawData.week_start,
			end_date: rawData.week_end,
		},
		player: {
			account_id: rawData.account_id,
			stats: {
				tier1: WrappedLogic.extractTier1(rawData),
				tier2: WrappedLogic.extractTier2(rawData),
				tier3: WrappedLogic.extractTier3(rawData),
				tier4: WrappedLogic.generateTier4Stats(rawData),
			},
		},
	};

	// Cache the response
	responseCache.set(cacheKey, response);

	// Fire-and-forget persistence if enabled
	// This won't block the response
	ClickHouseClient.persistWrappedData(
		accountId,
		rawData.week_start,
		rawData.week_end,
		rawData,
	).catch((err) => {
		c.var.logger.error("Persistence failed", err);
	});

	return c.json(response, StatusCodes.OK);
};
