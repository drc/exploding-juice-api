import { createRouter } from "@/lib/factory";
import * as handlers from "./error.handlers";
import * as routes from "./error.routes";

const router = createRouter().openapi(routes.getAnError, handlers.getAnError);

export default router;
