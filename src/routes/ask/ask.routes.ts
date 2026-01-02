import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "http-status-codes";

const tags = ["Fortune"];

const fortuneSchema = z.object({
	fortune: z
		.string()
		.min(1)
		.max(200)
		.openapi({
			examples: ["You will find great success.", "Happiness is around the corner."],
		}),
});

export const printAFortune = createRoute({
	method: "post",
	path: "/ask/print",
	request: {
		body: {
			content: {
				"application/json": {
					schema: fortuneSchema,
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
			description: `Returns a ${StatusCodes.CREATED} status code if the fortune was printed successfully.`,
		},
	},
	summary: "Print a fortune to the connected printer",
	tags: tags,
});

export type PrintAFortuneRoute = typeof printAFortune;
