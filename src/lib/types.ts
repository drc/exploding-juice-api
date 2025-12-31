import type { ImageData } from "@napi-rs/canvas";
import type { PinoLogger } from "hono-pino";

export type AppBindings = {
	Variables: {
		logger: PinoLogger;
	};
};

export type Screenshot = {
	image: ImageData;
	width: number;
	height: number;
};
