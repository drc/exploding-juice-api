import { createRoute } from "@hono/zod-openapi";

const tags = ["Error"];

export const getAnError = createRoute({
	method: "get",
	path: "/error",
	responses: {
		500: {
			description: "Internal Server Error",
		},
	},
	summary: "Simulate an error for testing purposes",
	tags: tags,
});

export type GetAnError = typeof getAnError;
