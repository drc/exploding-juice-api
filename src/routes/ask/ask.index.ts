import { createRouter } from "@/lib/factory";
import * as handlers from "./ask.handlers";
import * as routes from "./ask.routes";

const router = createRouter()
	.openapi(routes.askAndPrint, handlers.askAndPrint)
	.openapi(routes.printAFortune, handlers.printAFortune);

export default router;
