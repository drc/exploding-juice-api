import { createRouter } from "@/lib/factory";
import * as handlers from "./players.handlers";
import * as routes from "./players.routes";

const router = createRouter()
  .openapi(routes.searchPlayers, handlers.searchPlayers)
  .openapi(routes.getWeeklyWrapped, handlers.getWeeklyWrapped);

export default router;
