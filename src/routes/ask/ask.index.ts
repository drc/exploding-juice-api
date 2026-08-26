import { createRouter } from '@/lib/factory';

import { askAndPrint, printAFortune } from './ask.handlers';
import { askAndPrint as askAndPrintRoute, printAFortune as printAFortuneRoute } from './ask.routes';

const router = createRouter().openapi(askAndPrintRoute, askAndPrint).openapi(printAFortuneRoute, printAFortune);

export default router;
