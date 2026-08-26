# Fortune Cookie API

## Commands

- `pnpm install` installs dependencies; use `pnpm install --frozen-lockfile` to match CI.
- `pnpm dev` starts `tsx watch src/index.ts`.
- `pnpm lint` runs oxlint; `pnpm lint:fix` applies its fixes.
- `pnpm build` runs `tsc` and writes ignored output to `dist/`.
- `pnpm start` runs the built `dist/index.js` through `tsx`.
- There is no test suite or test script; verification is `pnpm lint && pnpm build`.
- Run `pnpm exec oxfmt --check` to check formatting; run `pnpm exec oxfmt` to format.

## Runtime Setup

- `LOG_LEVEL` is required. All environment variables are parsed by `src/env.ts`; invalid values terminate startup.
- Use `.env.example` as the variable list. `.env` and `.env.production` are ignored and must not be committed.
- Set `PRINTER_OFFLINE=true` for local runs without a thermal printer; otherwise `src/lib/printer.ts` opens a singleton TCP connection to `PRINTER_HOST:9100` during module load.

## Structure

- `src/index.ts` is the Node entrypoint; `src/app.ts` creates the app and mounts route groups at `/`.
- `src/lib/factory.ts` configures `OpenAPIHono`, logging, request IDs, error handling, `/health`, `/doc`, `/llms.txt`, and Scalar at `/`.
- Route groups live under `src/routes/<name>/`; `.index.ts` wires handlers, `.routes.ts` defines OpenAPI routes, and `.schema.ts` holds schemas.
- `@/` imports resolve to `src/` via `tsconfig.json`.
- Screenshot handling combines Playwright, `sharp`, and `@napi-rs/canvas`; native package install/build permissions are declared in `pnpm-workspace.yaml`.

## Endpoints

- `POST /ask` asks the fortune service and prints the result; `POST /ask/print` prints a supplied fortune.
- `POST /todo` screenshots a page and prints it.
- `POST /dota/match-result` fetches match and player details from OpenDota, including fallback player profile lookups, and prints the result.
- `GET /health` returns `OK`; `GET /doc` serves OpenAPI JSON; `GET /llms.txt` serves generated Markdown; `/` serves Scalar.

## CI And Git

- `.github/workflows/ci.yml` runs `lint` and `build` on pushes and pull requests targeting `main`; both jobs use the self-hosted `Linux`/`X64` runner and frozen pnpm installs.
- `main` is protected by required CI checks; dependency or workflow changes should go through a PR rather than a direct push.
- `.github/dependabot.yml` manages weekly npm and GitHub Actions updates, grouping Hono/Scalar and development dependencies.
