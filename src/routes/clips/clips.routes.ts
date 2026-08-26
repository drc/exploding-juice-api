import { createRoute, z } from '@hono/zod-openapi';
import { StatusCodes } from 'http-status-codes';

import clipRequestSchema from './clips.schema';

const tags = ['Clips'];

export const cutClip = createRoute({
  method: 'post',
  path: '/clips/cut',
  request: {
    body: {
      content: {
        'application/json': {
          schema: clipRequestSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'MP3 audio clip',
      content: {
        'audio/mpeg': {
          schema: z.any(),
        },
      },
    },
    [StatusCodes.BAD_REQUEST]: {
      description: 'Invalid input (bad URL, clip too long, etc.)',
      content: { 'application/json': { schema: z.object({ message: z.string() }) } },
    },
    [StatusCodes.TOO_MANY_REQUESTS]: {
      description: 'Too many concurrent clip requests',
      content: { 'application/json': { schema: z.object({ message: z.string() }) } },
    },
    [StatusCodes.BAD_GATEWAY]: {
      description: 'yt-dlp or ffmpeg failed',
      content: { 'application/json': { schema: z.object({ message: z.string() }) } },
    },
  },
  summary: 'Cut Audio Clip',
  description: 'Cut an audio clip from a YouTube video',
  tags,
});

export type CutClipRoute = typeof cutClip;
