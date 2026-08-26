# f0r†un3_c0ok1€

A TypeScript HTTP API for printing fortunes, to-do items, and Dota 2 results to a network thermal printer. It also provides ClickHouse-backed player metrics and audio clip generation.

## Quick Start

Install dependencies and start the development server:

```shell
pnpm install
LOG_LEVEL=info pnpm dev
```

The API documentation is available at <http://localhost:3000> and the OpenAPI document is at <http://localhost:3000/doc>.

`LOG_LEVEL` is required. For local development without a printer, set `PRINTER_OFFLINE=true`:

```shell
LOG_LEVEL=info PRINTER_OFFLINE=true pnpm dev
```

## Commands

```shell
pnpm dev                    # Start tsx watch mode
pnpm lint                   # Run oxlint
pnpm lint:fix               # Apply oxlint fixes
pnpm exec oxfmt --check     # Check formatting
pnpm build                  # Typecheck and write dist/
pnpm start                  # Run the built application
pnpm audit                  # Check dependency vulnerabilities
```

There is no test suite. CI verifies the project with `pnpm lint` and `pnpm build`.

## API Endpoints

### Fortune

`POST /ask` asks the fortune service a question and prints the response:

```shell
curl -X POST http://localhost:3000/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"Will I find success?"}'
```

`POST /ask/print` prints a supplied fortune:

```shell
curl -X POST http://localhost:3000/ask/print \
  -H "Content-Type: application/json" \
  -d '{"fortune":"You will find great success."}'
```

Both endpoints accept strings from 1 to 200 characters and return `201` on success.

### Printing And Media

- `POST /todo` accepts `{ "title": string }`, screenshots the requested page, and prints it.
- `POST /dota/match-result` accepts a Dota match ID and starts a background thermal print job; it returns `202`.
- `POST /clips/cut` creates an MP3 clip from a YouTube video. It requires `yt-dlp` and `ffmpeg` in the runtime environment.

### Dota And Service

- `GET /players/search?query=&limit=` searches Dota players through ClickHouse.
- `GET /players/wrapped/{accountId}` returns weekly wrapped metrics from ClickHouse.
- `GET /health` returns `OK`.
- `GET /doc` returns the OpenAPI 3.1 document.
- `GET /llms.txt` returns Markdown generated from the OpenAPI document.
- `GET /` serves the Scalar API reference.

## Configuration

All environment variables are validated at startup by `src/env.ts`. Invalid values terminate the process. Use `.env.example` as the variable list.

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOG_LEVEL` | required | Pino log level: `fatal`, `error`, `warn`, `info`, `debug`, or `trace` |
| `NODE_ENV` | `development` | Selects development or production logging and error details |
| `PORT` | `3000` | HTTP server port |
| `PRINTER_HOST` | `10.0.1.128` | Thermal printer hostname or address |
| `PRINTER_OFFLINE` | `false` | Skip printer networking and render a terminal preview |
| `CLICKHOUSE_URL` | `https://clickhouse.ponder.guru` | ClickHouse read endpoint |
| `CLICKHOUSE_USER` | `default` | ClickHouse read user |
| `CLICKHOUSE_PASSWORD` | unset | ClickHouse read password; may be a shell command |
| `CLICKHOUSE_WRITE_URL` | unset | Optional ClickHouse write endpoint |
| `CLICKHOUSE_WRITE_USER` | unset | Optional ClickHouse write user |
| `CLICKHOUSE_WRITE_PASSWORD` | unset | Optional ClickHouse write password; may be a shell command |
| `CLICKHOUSE_WRITE_DATABASE` | `default` | ClickHouse write database |
| `CLICKHOUSE_WRITE_TABLE` | `wrapped_data` | ClickHouse write table |
| `ENABLE_PERSISTENCE` | `false` | Enable fire-and-forget ClickHouse writes |
| `CACHE_TTL_MINUTES` | `1440` | In-memory cache lifetime |
| `CLIP_API_SECRET` | unset | Secret used to authorize clip requests |

The printer uses TCP port `9100` and connects when the printer module loads unless offline mode is enabled. The application uses Playwright for screenshots, `sharp` for image conversion, and `@napi-rs/canvas` for printer image data.

## Development Notes

- The Node entrypoint is `src/index.ts`; route groups are mounted by `src/app.ts`.
- Each route group under `src/routes/` separates route definitions, handlers, schemas, and wiring.
- `@/` imports resolve to `src/` through `tsconfig.json`.
- `dist/` is generated and ignored by git.
