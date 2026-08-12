import { StatusCodes } from "http-status-codes";
import env from "@/env";
import { createRouter } from "@/lib/factory";
import * as handlers from "./clips.handlers";
import * as routes from "./clips.routes";

const router = createRouter();

router.use("/clips/*", async (c, next) => {
  const secret = c.req.header("X-Clip-Secret");
  if (!secret || secret !== env.CLIP_API_SECRET) {
    return c.json({ message: "Unauthorized" }, StatusCodes.UNAUTHORIZED);
  }
  await next();
});

router.openapi(routes.cutClip, handlers.cutClip);

export default router;
