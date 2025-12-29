import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { client, encoder } from "../lib/printer.js";

const fortuneSchema = z.object({
	fortune: z
		.string()
		.min(1)
		.max(200)
		.openapi({ example: "What will my future hold?" }),
});

const fortuneRoute = createRoute({
	method: "post",
	path: "/fortune",
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
			description:
				"Returns a 201 status code if the fortune was printed successfully.",
		},
	},
});

export function registerFortune(app: OpenAPIHono): void {
	app.openapi(fortuneRoute, (c) => {
		const { fortune } = c.req.valid("json");
		console.log("Printing fortune:", fortune);
		client.write(encoder.line(fortune).newline(5).cut().encode());
		return c.json({}, 201);
	});
}
