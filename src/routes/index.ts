import type { OpenAPIHono } from "@hono/zod-openapi";

import { registerFortune } from "@/routes/fortune";
import type { AppBindings } from "@/types";

export function registerRoutes(app: OpenAPIHono<AppBindings>): void {
	registerFortune(app);
}
