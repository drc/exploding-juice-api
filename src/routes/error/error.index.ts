import { createRouter } from '@/lib/factory';

import getAnError from './error.handlers';
import { getAnError as getAnErrorRoute } from './error.routes';

const router = createRouter().openapi(getAnErrorRoute, getAnError);

export default router;
