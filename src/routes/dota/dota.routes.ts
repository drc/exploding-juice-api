import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "http-status-codes";
import { matchIdSchema } from "./dota.schema";

const tags = ["Dota 2"];

export const printMatchResult = createRoute({
  method: "post",
  path: "/dota/match-result",
  request: {
    body: {
      content: {
        "application/json": {
          schema: matchIdSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.null(),
        },
      },
      description: `Returns a ${StatusCodes.CREATED} status code if the match summary was printed successfully.`,
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string(), match_id: z.string() }),
        },
      },
      description: "Match not found / not yet available on Stratz",
    },
    502: {
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
      description: "Upstream Stratz API error",
    },
  },
  summary:
    "Print a Dota 2 match summary (winner, score, team lineups) to the thermal printer. Fetches match data from Stratz by match_id.",
  tags: tags,
});

export type PrintMatchResultRoute = typeof printMatchResult;
