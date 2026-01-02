import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { ImageData } from "@napi-rs/canvas";
import type { RequestIdVariables } from "hono/request-id";
import type { PinoLogger } from "hono-pino";

export interface AppBindings {
	Variables: {
		logger: PinoLogger;
		RequestIdVariables: RequestIdVariables;
	};
}

export interface Screenshot {
	image: ImageData;
	width: number;
	height: number;
}

export type AppRouteHander<R extends RouteConfig> = RouteHandler<R, AppBindings>;
