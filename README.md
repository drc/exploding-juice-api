# Fortune Cookie Printer

A tiny HTTP API that prints short fortunes to a network thermal receipt printer.

Features

- POST /fortune (application/json) — prints a fortune and returns 201
- OpenAPI / Swagger UI available at /doc
- Lightweight, TypeScript-based server using Hono and zod

Quick start

1. Install dependencies:

   npm install

2. Start the dev server:

   npm run dev

3. Open the API docs:

   <http://localhost:3000>

Usage
Post a JSON body with a single "fortune" string (1–200 characters):

curl -X POST <http://localhost:3000/fortune> \
  -H "Content-Type: application/json" \
  -d '{"fortune":"You will find joy today."}'

Configuration

- Printer host & port are configured in src/lib/printer.ts:4-5 (HOST, PORT).
- Enable thermal client logs by setting NODE_ENV (see src/lib/printer.ts:7-10).
- The code sends the encoded print job in src/index.ts:33-38.

Development

- Dev server: npm run dev (uses tsx watch src/index.ts)
- Build: npm run build (runs tsc)
- Start (production): npm start

Testing without a printer
Listen on the printer port to capture output (example with netcat):

  nc -l 9100

Troubleshooting

- If nothing prints, confirm the printer is reachable at the HOST/PORT and that there are no network firewalls.

License

- None specified.
