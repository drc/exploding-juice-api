import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "http-status-codes";
import { client, encoder } from "@/lib/printer";
import type { AppBindings } from "@/lib/types";

const fortuneSchema = z.object({
	fortune: z
		.string()
		.min(1)
		.max(200)
		.openapi({
			examples: [
				"You will find great success.",
				"Happiness is around the corner.",
			],
		}),
});

const fortuneRoute = createRoute({
	tags: ["Fortune"],
	summary: "Print a fortune to the connected printer",
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
			content: {
				"application/json": {
					schema: z.object({}),
				},
			},
			description: `Returns a ${StatusCodes.CREATED} status code if the fortune was printed successfully.`,
		},
	},
});

export function registerFortune(app: OpenAPIHono<AppBindings>): void {
	app.openapi(fortuneRoute, (c) => {
		const { fortune } = c.req.valid("json");
		console.log("Printing fortune:", fortune);
		client.write(encoder.line(fortune).newline(5).cut().encode());
		return c.json({}, StatusCodes.CREATED);
	});
}
