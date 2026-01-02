import { createRouter } from "@/lib/factory";
import * as handlers from "./todo.handlers";
import * as routes from "./todo.routes";

const router = createRouter().openapi(routes.printTodo, handlers.printTodo);

export default router;
