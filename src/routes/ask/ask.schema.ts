import { z } from "@hono/zod-openapi";

export const fortuneSchema = z.object({
	fortune: z
		.string()
		.min(1)
		.max(200)
		.openapi({
			examples: ["You will find great success.", "Happiness is around the corner."],
		}),
});

export const askAndPrintSchema = z.object({
	question: z
		.string()
		.min(1)
		.max(200)
		.openapi({
			examples: [
				"Will I be too cold without a jacket?",
				"Will I find success?",
				"Is it going to rain today?",
				"Should I invest in stocks?",
			],
		}),
});
