import { createRouter } from '@/lib/factory';

import printMatchResult from './dota.handlers';
import { printMatchResult as printMatchResultRoute } from './dota.routes';

const router = createRouter().openapi(printMatchResultRoute, printMatchResult);

export default router;
