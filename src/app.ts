import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { pinoLogger } from "hono-pino";
import pino from "pino";
import pretty from "pino-pretty";
import { registerRoutes } from "@/routes/index";
import type { AppBindings } from "@/types";

const app = new OpenAPIHono<AppBindings>();

app.use(
	pinoLogger({
		pino: pino(
			{ level: process.env.LOG_LEVEL || "info" },
			process.env.NODE_ENV === "production" ? undefined : pretty(),
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
		title: "f0r†un3_c0ok1€",
		version: "1.0.0",
	},
});

app.get("/", Scalar({ url: "/doc", layout: "classic" }));

app.get("/error", (c) => {
	c.var.logger.error("hello world error");
	throw new Error("This is a test error");
});

app.notFound((c) => c.json({ message: `Not Found: ${c.req.path}` }, 404));

app.onError((err, c) => {
	console.error("Error occurred:", err);
	const env = process.env.NODE_ENV || "development";
	return c.json(
		{
			message: err.message || "Internal Server Error",
			stack: env === "development" ? err.stack : undefined,
		},
		500,
	);
});

export default app;
