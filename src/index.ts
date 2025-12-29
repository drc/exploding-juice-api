import { serve } from "@hono/node-server";
import { OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";

import { registerRoutes } from "./routes/index.js";

const app = new OpenAPIHono();

registerRoutes(app);

app.doc("/doc", {
	openapi: "3.1.0",
	info: {
		title: "Fortune Cookie Printer API",
		version: "1.0.0",
	},
});

app.get("/", Scalar({ url: "/doc" }));

serve(
	{
		fetch: app.fetch,
		port: 3000,
	},
	(info) => {
		console.log(`Server is running on http://localhost:${info.port}`);
	},
);
