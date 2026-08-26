import { z } from '@hono/zod-openapi';

const ALLOWED_HOSTNAMES = new Set(['youtube.com', 'youtu.be', 'music.youtube.com']),
  clipRequestSchema = z
    .object({
      url: z
        .string()
        .url()
        .openapi({ examples: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ'] }),
      start: z
        .number()
        .int()
        .min(0)
        .openapi({ examples: [0] }),
      end: z
        .number()
        .int()
        .positive()
        .openapi({ examples: [10] }),
      name: z
        .string()
        .min(1)
        .max(80)
        .regex(/^[a-z0-9_-]+$/)
        .optional()
        .openapi({ examples: ['my_clip'] }),
    })
    .refine((data) => {
      const hostname = new URL(data.url).hostname.replace(/^www\./, '');
      return ALLOWED_HOSTNAMES.has(hostname);
    }, 'URL must be a YouTube link')
    .refine((data) => data.end - data.start > 0, 'end must be greater than start')
    .refine((data) => data.end - data.start <= 60, 'clip must be 60 seconds or less');

export default clipRequestSchema;
