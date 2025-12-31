import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { createMarkdownFromOpenApi } from "@scalar/openapi-to-markdown";
import { pinoLogger } from "hono-pino";
import { StatusCodes } from "http-status-codes";
import pino from "pino";
import pretty from "pino-pretty";
import env from "@/env";
import type { AppBindings } from "@/lib/types";
import { registerRoutes } from "@/routes/index";
import packageJson from "../package.json";

const TITLE = "f0r†un3_c0ok1€";

const app = new OpenAPIHono<AppBindings>();

app.use(
	pinoLogger({
		pino: pino(
			{ level: env.LOG_LEVEL },
			env.NODE_ENV === "production" ? undefined : pretty(),
		),
		http: {
			reqId: () => crypto.randomUUID(),
		},
	}),
);

registerRoutes(app);

app.doc("/doc", {
	openapi: "3.1.0",
	info: {
		title: TITLE,
		version: packageJson.version,
	},
});

app.get(
	"/",
	Scalar({
		pageTitle: TITLE,
		theme: "laserwave",
		url: "/doc",
		layout: "classic",
		defaultHttpClient: {
			targetKey: "js",
			clientKey: "fetch",
		},
		defaultOpenAllTags: true,
	}),
);

app.get("/error", (c) => {
	c.var.logger.error("hello world error");
	throw new Error("This is a test error");
});

app.get("/llms.txt", async (c) => {
	const r = await app.request("/doc");
	const markdown = await createMarkdownFromOpenApi(await r.json());
	return c.text(markdown);
});

app.notFound((c) =>
	c.json({ message: `Not Found: ${c.req.path}` }, StatusCodes.NOT_FOUND),
);

app.onError((err, c) => {
	console.error("Error occurred:", err);
	return c.json(
		{
			message: err.message || "Internal Server Error",
			stack: env.NODE_ENV === "development" ? err.stack : undefined,
		},
		StatusCodes.INTERNAL_SERVER_ERROR,
	);
});

export default app;
