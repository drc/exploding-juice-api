import { StatusCodes } from "http-status-codes/build/cjs/status-codes";
import app from "@/app";
import { client, encoder } from "@/lib/printer";
import type { AppRouteHander } from "@/lib/types";
import type { AskAndPrintRoute, PrintAFortuneRoute } from "./ask.routes";

export const printAFortune: AppRouteHander<PrintAFortuneRoute> = (c) => {
	const { fortune } = c.req.valid("json");
	console.log("Printing fortune:", fortune);
	client.write(encoder.line(fortune).newline(5).cut().encode());
	return c.json(null, StatusCodes.CREATED);
};

export const askAndPrint: AppRouteHander<AskAndPrintRoute> = async (c) => {
	const { question } = c.req.valid("json");

	const orb_response = await fetch("https://orb.ponder.guru/", {
		body: JSON.stringify({ question }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});
	const { wisdom } = await orb_response.json();

	const print_response = await app.request("/ask/print", {
		body: JSON.stringify({ fortune: wisdom }),
		headers: { "Content-Type": "application/json" },
		method: "POST",
	});

	if (!print_response.ok) {
		throw new Error("Failed to print fortune");
	}

	return c.json(null, StatusCodes.CREATED);
};
