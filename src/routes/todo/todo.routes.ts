import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "http-status-codes";

const toDoSchema = z.object({
	title: z
		.string()
		.min(1)
		.max(200)
		.openapi({
			description: "The title of the to-do item",
			examples: ["Order Corn", "Buy Milk"],
		}),
});

export const printTodo = createRoute({
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
					schema: z.null(),
				},
			},
			description: `Returns a ${StatusCodes.CREATED} status code if the to-do item was printed successfully.`,
		},
	},
	summary: "Print a to-do item to the connected printer",
	tags: ["ToDo"],
});

export type PrintTodo = typeof printTodo;
