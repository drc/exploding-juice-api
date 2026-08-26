import askRoutes from "@/routes/ask/ask.index";
import clipsRoutes from "@/routes/clips/clips.index";
import dotaRoutes from "@/routes/dota/dota.index";
import errorRoutes from "@/routes/error/error.index";
import todoRoutes from "@/routes/todo/todo.index";
import createApp, { configureOpenAPI } from "./lib/factory";

const app = createApp();

configureOpenAPI(app);

const routes = [askRoutes, todoRoutes, errorRoutes, clipsRoutes, dotaRoutes] as const;

routes.forEach((route) => {
  app.route("/", route);
});

app.get("/error", (c) => {
  c.var.logger.error("hello world error");
  throw new Error("This is a test error");
});

export default app;
