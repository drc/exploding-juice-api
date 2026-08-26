import { StatusCodes } from 'http-status-codes/build/cjs/status-codes';

import { encoder, print } from '@/lib/printer';
import takeScreenshot from '@/lib/takeScreenshot';
import type { AppRouteHander } from '@/lib/types';

import type { PrintTodo } from './todo.routes';

const printTodo: AppRouteHander<PrintTodo> = async (c) => {
  const { title } = c.req.valid('json');
  console.log('Printing to-do item:', title);
  const screenshot = await takeScreenshot(
    `https://printer.explosivejuice.com/todo?item=${encodeURIComponent(title)}`,
    'main',
  );
  encoder.align('center').image(screenshot.image, screenshot.width, screenshot.height, 'atkinson').newline(2);
  print(encoder.cut());
  return c.json(null, StatusCodes.CREATED);
};

export default printTodo;
