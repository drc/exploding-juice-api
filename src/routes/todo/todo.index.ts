import { createRouter } from '@/lib/factory';

import printTodo from './todo.handlers';
import { printTodo as printTodoRoute } from './todo.routes';

const router = createRouter().openapi(printTodoRoute, printTodo);

export default router;
