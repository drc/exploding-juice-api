import { StatusCodes } from "http-status-codes/build/cjs/status-codes";
import { client, encoder } from "@/lib/printer";
import type { AppRouteHander } from "@/lib/types";
import type { PrintAFortuneRoute } from "./ask.routes";

export const printAFortune: AppRouteHander<PrintAFortuneRoute> = (c) => {
	const { fortune } = c.req.valid("json");
	console.log("Printing fortune:", fortune);
	client.write(encoder.line(fortune).newline(5).cut().encode());
	return c.json(null, StatusCodes.CREATED);
};
