import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "http-status-codes";
import { askAndPrintSchema, fortuneSchema } from "./ask.schema";

const tags = ["Fortune"];

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

export const askAndPrint = createRoute({
	method: "post",
	path: "/ask",
	request: {
		body: {
			content: {
				"application/json": {
					schema: askAndPrintSchema,
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
	summary: "Ask for a fortune and print it to the connected printer",
	tags: tags,
});

export type AskAndPrintRoute = typeof askAndPrint;
export type PrintAFortuneRoute = typeof printAFortune;
