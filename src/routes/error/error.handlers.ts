import type { AppRouteHander } from "@/lib/types";
import type { GetAnError } from "./error.routes";

export const getAnError: AppRouteHander<GetAnError> = async (c) => {
	c.var.logger.error("hello world error");
	throw new Error("This is a test error");
};
