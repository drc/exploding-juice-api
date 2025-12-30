# Fortune Cookie Printer

A tiny HTTP API that prints short fortunes to a network thermal receipt printer.

Features

- POST /fortune (application/json) — prints a fortune and returns 201
- POST /todo (application/json) — prints a to-do item and returns 201
- API reference landing page at / (Scalar API Reference) with OpenAPI JSON available at /doc
- Lightweight, TypeScript-based server using Hono and zod

Quick start

1. Install dependencies:

   pnpm install

2. Start the dev server (LOG_LEVEL is required):

   LOG_LEVEL=info pnpm run dev

3. Open the API docs:

   http://localhost:3000

Usage

Post a JSON body with a single "fortune" string (1–200 characters):

curl -X POST http://localhost:3000/fortune \
  -H "Content-Type: application/json" \
  -d '{"fortune":"You will find joy today."}'

Post a JSON body with a single "todo" string (1–200 characters):

curl -X POST http://localhost:3000/todo \
  -H "Content-Type: application/json" \
  -d '{"todo":"Buy milk."}'

Configuration

- Environment variables:
  - NODE_ENV: "development" | "production" (default: development). Controls pretty logging and whether printer socket logs are emitted (see src/env.ts:3-8 and src/lib/printer.ts:8-11).
  - PORT: server port (default: 3000) — see src/env.ts:5 and src/index.ts:6-10.
  - LOG_LEVEL: one of fatal, error, warn, info, debug, trace (required). Used by pino (see src/env.ts:6 and src/app.ts:16-22).
  - PRINTER_HOST: thermal printer host (default: "10.0.1.128") — see src/env.ts:7 and src/lib/printer.ts:5-6.
- Printer port: 9100 (constant in src/lib/printer.ts:5).
- Printer encoding: columns=48, feedBeforeCut=5 (see src/lib/printer.ts:66-69).
- Print jobs are encoded and sent with encoder.line(...).newline(5).cut().encode() in src/routes/fortune.ts:50 and src/routes/todo.ts:47.

Development & running

- Set LOG_LEVEL (required): LOG_LEVEL=info pnpm run dev
- Dev server: pnpm run dev (uses tsx watch src/index.ts)
- Build: pnpm run build (runs tsc)
- Start (production): pnpm start

API Endpoints

- POST /fortune — prints a fortune (body: { "fortune": string }, 1–200 chars) and returns 201 (see src/routes/fortune.ts).
- POST /todo — prints a to-do item (body: { "todo": string }, 1–200 chars) and returns 201 (see src/routes/todo.ts).
- GET /doc — OpenAPI JSON (OpenAPI 3.1.0) exported by the app (see src/app.ts:30-36).
- GET / — API reference landing page (Scalar API Reference, theme "laserwave") linking to /doc (see src/app.ts:38-51).
- GET /error — test route that throws an error (stack traces shown only in development) (see src/app.ts:53-56).

Testing without a printer

- For local testing, set PRINTER_HOST=127.0.0.1 and listen on the printer port:

  PRINTER_HOST=127.0.0.1 nc -l 9100

- Then POST to /fortune or /todo to see the raw bytes in the nc listener.

Troubleshooting

- If nothing prints, confirm PRINTER_HOST and port and that there are no network firewalls.
- Missing or invalid environment variables cause the server to exit with an error (see src/env.ts:14-21).

License

- None specified.
