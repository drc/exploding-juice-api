# Fortune Cookie API

Hono TypeScript server (pnpm). Thermal printer + Dota 2 analytics API.

## Commands

- **dev**: `pnpm dev` — `tsx watch src/index.ts`
- **build**: `pnpm build` — `tsc` (outputs to `dist/`)
- **start**: `pnpm start` — `tsx dist/index.js`
- **lint**: `pnpm lint` — `oxlint`
- **lint:fix**: `pnpm lint:fix` — `oxlint --fix`
- **format**: `pnpm oxfmt` (no script; run `oxfmt` directly)

No tests, no CI, no test framework.

## GitHub Actions / Dependabot

- `.github/dependabot.yml` — weekly npm + GH Actions dep updates, grouped by scope (hono, dev-deps, etc.)
- `.github/workflows/ci.yml` — lint + build on push/PR to `main`. Uses `pnpm/action-setup@v4`, node version from `package.json` `engines`, pnpm cache.

## Env

`LOG_LEVEL` is required. Copy `.env.example` → `.env`. All vars validated via Zod at startup; server exits on invalid env.

## Architecture

- **Entrypoint**: `src/index.ts` → `serve(@hono/node-server)`
- **App factory**: `src/lib/factory.ts` — creates `OpenAPIHono`, wires pino logger, request ID, notFound/onError, Scalar docs at `/`, OpenAPI JSON at `/doc`, `/health`, `/llms.txt`
- **Routes**: each route group is `src/routes/<name>/` with `*.index.ts` (wires routes+handlers), `*.routes.ts` (zod-openapi route defs), `*.handlers.ts`, `*.schema.ts`
- **Route mounting**: `src/app.ts` mounts all route routers at `/`
- **Import path alias**: `@/` → `./src/*` (configured in tsconfig)

## Routes

| Path | Description |
|------|-------------|
| `POST /ask` | Ask orb.ponder.guru for wisdom, print to thermal printer |
| `POST /ask/print` | Print a fortune string directly |
| `POST /todo` | Screenshot a web page, print it as image to thermal printer |
| `GET /players/search?query=&limit=` | Dota 2 player search via ClickHouse |
| `GET /players/wrapped/:accountId` | Weekly wrapped stats via ClickHouse |
| `GET /error` | Test error route |
| `GET /health` | Returns "OK" |
| `/` | Scalar API reference UI |

## Notable

- **Printer**: global singleton socket (`src/lib/printer.ts:23`). Connects on module load. Port `9100`, host from `PRINTER_HOST` env (default `10.0.1.128`). Uses `@point-of-sale/receipt-printer-encoder`.
- **ClickHouse**: raw SQL string interpolation (`src/services/clickhouse.ts:228-231`). Credentials can be shell commands: `CLICKHOUSE_PASSWORD=$(some_cmd)`. Persistence is optional (fire-and-forget, gated by `ENABLE_PERSISTENCE=true`).
- **Cache**: in-memory `Map` with TTL (`CACHE_TTL_MINUTES`, default 1440 min).
- **Screenshots**: uses Playwright `chromium.launch()`, sharp for conversion, `@napi-rs/canvas` ImageData.
- **OpenAPI**: auto-generated via `@hono/zod-openapi`, served at `/doc`, rendered at `/` via Scalar (laserwave theme).

## Stale docs

`README.md` references `src/routes/fortune.ts` — the fortune routes live in `src/routes/ask/`. `.vscode/settings.json` references biome — project uses oxlint/oxfmt.