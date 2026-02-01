import { createRouter } from "@/lib/factory";
import * as handlers from "./dboys.handlers";
import * as routes from "./dboys.routes";

const router = createRouter().openapi(routes.proxyDoughboysRequest, handlers.proxyDoughboysRequest);

export default router;
