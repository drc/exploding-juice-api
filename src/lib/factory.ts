import { OpenAPIHono } from '@hono/zod-openapi';
import { Scalar } from '@scalar/hono-api-reference';
import { createMarkdownFromOpenApi } from '@scalar/openapi-to-markdown';
import { pinoLogger } from 'hono-pino';
import { requestId } from 'hono/request-id';
import { StatusCodes } from 'http-status-codes';
import pino from 'pino';
import pretty from 'pino-pretty';

import env from '@/env';

import packageJson from '../../package.json';
import type { AppBindings } from './types';

const TITLE = 'f0r†un3_c0ok1€';

export function createRouter() {
  return new OpenAPIHono<AppBindings>();
}

export default function createApp() {
  const app = createRouter();
  app.get('/health', (c) => c.text('OK'));
  app.use(requestId()).use(
    pinoLogger({
      pino: pino({ level: env.LOG_LEVEL }, env.NODE_ENV === 'production' ? undefined : pretty()),
    }),
  );

  app.get('/llms.txt', async (c) => {
    const r = await app.request('/doc');
    const markdown = await createMarkdownFromOpenApi(await r.json());
    return c.text(markdown);
  });

  app.notFound((c) => c.json({ message: `Not Found: ${c.req.path}` }, StatusCodes.NOT_FOUND));

  app.onError((err, c) => {
    console.error('Error occurred:', err);
    return c.json(
      {
        message: err.message || 'Internal Server Error',
        stack: env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  });
  return app;
}

export function configureOpenAPI(app: OpenAPIHono<AppBindings>) {
  app.doc('/doc', {
    info: {
      title: TITLE,
      version: packageJson.version,
    },
    openapi: '3.1.0',
  });

  app.get(
    '/',
    Scalar({
      darkMode: true,
      defaultHttpClient: {
        clientKey: 'curl',
        targetKey: 'shell',
      },
      defaultOpenAllTags: true,
      hiddenClients: {
        c: ['libcurl'],
        clojure: ['clj_http'],
        csharp: ['httpclient', 'restsharp'],
        dart: ['http'],
        fsharp: ['httpclient'],
        go: ['native'],
        http: ['http1.1'],
        java: ['asynchttp', 'nethttp', 'okhttp', 'unirest'],
        js: ['axios', 'fetch', 'jquery', 'ofetch', 'xhr'],
        julia: ['http'],
        kotlin: ['okhttp'],
        node: ['axios', 'ofetch'],
        objc: ['nsurlsession'],
        ocaml: ['cohttp'],
        php: ['curl', 'guzzle', 'laravel'],
        powershell: ['restmethod', 'webrequest'],
        python: ['aiohttp', 'httpx_async', 'httpx_sync'],
        r: ['httr2'],
        ruby: ['native'],
        rust: ['reqwest'],
        shell: ['httpie', 'wget'],
        swift: ['nsurlsession'],
      },
      layout: 'modern',
      pageTitle: TITLE,
      theme: 'fastify',
      url: '/doc',
    }),
  );
}
