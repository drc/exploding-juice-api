import type { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "@/lib/types";
import { registerFortune } from "@/routes/fortune";
import { registerToDo } from "./todo";

export function registerRoutes(app: OpenAPIHono<AppBindings>): void {
	registerFortune(app);
	registerToDo(app);
}
