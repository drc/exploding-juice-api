import { createRoute, z } from '@hono/zod-openapi';

import { matchIdSchema } from './dota.schema';

const tags = ['Dota 2'];

export const printMatchResult = createRoute({
  method: 'post',
  path: '/dota/match-result',
  request: {
    body: {
      content: {
        'application/json': {
          schema: matchIdSchema,
        },
      },
    },
  },
  responses: {
    202: {
      content: {
        'application/json': {
          schema: z.object({
            status: z.literal('accepted'),
            match_id: z.string(),
          }),
        },
      },
      description: 'Match print job accepted and running in the background.',
    },
  },
  summary: 'Print Match Result',
  description:
    'Print a Dota 2 match summary (winner, score, team lineups) to the thermal printer. Fetches match data from OpenDota by match_id.',
  tags,
});

export type PrintMatchResultRoute = typeof printMatchResult;
