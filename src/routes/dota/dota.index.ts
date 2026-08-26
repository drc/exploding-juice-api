import { createRouter } from '@/lib/factory';

import * as handlers from './dota.handlers';
import * as routes from './dota.routes';

const router = createRouter().openapi(routes.printMatchResult, handlers.printMatchResult);

export default router;
