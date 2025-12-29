import type { OpenAPIHono } from "@hono/zod-openapi";

import { registerFortune } from "./fortune.js";

export function registerRoutes(app: OpenAPIHono): void {
	registerFortune(app);
}
