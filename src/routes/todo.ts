import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "http-status-codes";
import { client, encoder } from "@/lib/printer";
import type { AppBindings } from "@/lib/types";

const toDoSchema = z.object({
	todo: z
		.string()
		.min(1)
		.max(200)
		.openapi({
			examples: [
				"Order Corn",
				"Buy Milk",
			],
		}),
});

const toDoRoute = createRoute({
	tags: ["ToDo"],
	summary: "Print a to-do item to the connected printer",
	method: "post",
	path: "/todo",
	request: {
		body: {
			content: {
				"application/json": {
					schema: toDoSchema,
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
			description: `Returns a ${StatusCodes.CREATED} status code if the to-do item was printed successfully.`,
		},
	},
});

export function registerToDo(app: OpenAPIHono<AppBindings>): void {
	app.openapi(toDoRoute, (c) => {
		const { todo } = c.req.valid("json");
		console.log("Printing to-do item:", todo);
		client.write(encoder.line(todo).newline(5).cut().encode());
		return c.json({}, StatusCodes.CREATED);
	});
}
