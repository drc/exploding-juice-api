import { z } from '@hono/zod-openapi';

export const matchPlayerSchema = z.object({
  player_name: z
    .string()
    .min(1)
    .max(64)
    .openapi({ examples: ['Dancigrang', 'xX_slayer'] }),
  hero: z
    .string()
    .min(1)
    .max(32)
    .openapi({ examples: ['Invoker', 'Juggernaut'] }),
  kills: z.number().int().min(0).max(1000),
  deaths: z.number().int().min(0).max(1000),
  assists: z.number().int().min(0).max(1000),
});

export const matchIdSchema = z.object({
  match_id: z
    .string()
    .min(1)
    .max(32)
    .openapi({ examples: ['8234567890'] }),
});

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
