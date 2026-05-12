import { execSync } from "child_process";
import env from "@/env";

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

// Read credentials
const CLICKHOUSE_URL = env.CLICKHOUSE_URL;
const CLICKHOUSE_USER = env.CLICKHOUSE_USER;
const CLICKHOUSE_PASSWORD = resolveCredential(env.CLICKHOUSE_PASSWORD);

export interface PlayerSearchResult {
	id: number;
	username: string;
	created_at: string;
}

export class PlayerService {
	/**
	 * Search for players by username (case-insensitive, partial match)
	 */
	static async searchPlayers(query: string, limit: number = 10): Promise<PlayerSearchResult[]> {
		try {
			// Validate input
			if (!query || query.trim().length === 0) {
				return [];
			}

			const cleanQuery = query.trim();

			// Build query using simple string interpolation for the pattern
			// Since concat() with lower() doesn't work reliably in ClickHouse LIKE, we build the literal pattern
			const lowerQuery = cleanQuery.toLowerCase();
			const sqlQuery = `
SELECT 
  id,
  username,
  created_at
FROM users
WHERE lower(username) LIKE '%${lowerQuery}%'
ORDER BY username
LIMIT ${limit}
FORMAT JSON
`;

			// Build auth header
			const authHeader = `Basic ${Buffer.from(`${CLICKHOUSE_USER}:${CLICKHOUSE_PASSWORD}`).toString(
				"base64",
			)}`;

			const response = await fetch(CLICKHOUSE_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: authHeader,
				},
				body: sqlQuery,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`ClickHouse error (${response.status}): ${errorText}`);
			}

			// Parse JSON response
			const jsonResponse = (await response.json()) as {
				data?: Array<{
					id: number;
					username: string;
					created_at: string;
				}>;
			};

			if (!jsonResponse.data || jsonResponse.data.length === 0) {
				return [];
			}

			// Map ClickHouse response to PlayerSearchResult
			return jsonResponse.data.map((row) => ({
				id: row.id,
				username: row.username,
				created_at: row.created_at,
			}));
		} catch (error) {
			if (error instanceof Error) {
				console.error("ClickHouse error during player search:", error.message);
				throw new Error(`Failed to search players: ${error.message}`);
			}
			throw error;
		}
	}
}
