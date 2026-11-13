# Team Republic

Politically neutral election and candidate information app, starting with Tamil Nadu.

- `product-doc.md`: vision, personas, features, decisions, open questions (source of truth)
- `data-sources.md`: researched data sources, licences, MVP data strategy

Workflow: update decisions in `product-doc.md` and commit each change with a clear message. Coding agents should read both docs before starting work.

## Layout

| Path | What |
| --- | --- |
| `packages/contracts` | Effect Schema domain types, typed errors, RPC definitions |
| `packages/client` | Effect RPC client, `@effect/atom-react` atoms, Tamil/English UI labels |
| `apps/api` | Node API: Effect RPC (`/rpc`), public HttpApi (`/health`, `/openapi.json`), Better Auth (`/api/auth/*`), outbox worker, ingestion scripts |
| `apps/web` | React + Vite + TanStack Router + Tailwind 4 |
| `apps/mobile` | Expo + Expo Router + uniwind + Legend List |

## Run locally

Requires Node 24.22.1 (`.node-version`; `fnm use` picks it up), pnpm via corepack, and Docker.

First run:

```sh
corepack enable
pnpm install
cp .env.example .env
docker compose up -d --wait     # Postgres 18 + SeaweedFS (S3-compatible)
pnpm db:migrate                 # apply drizzle migrations
pnpm db:seed                    # load TN Assembly 2021 and 2026 from ECI (downloads are cached in .cache/)
```

Every day:

```sh
pnpm dev                        # starts Docker, applies migrations, runs API + web
pnpm dev:mobile                 # Expo, in a second terminal (press i / a / w)
```

| URL | What |
| --- | --- |
| https://team-republic.localhost | Web app. `/rpc`, `/api/*` and `/health` are proxied to the API, so the browser stays on one origin |
| https://api.team-republic.localhost | API directly (`/health`, `/openapi.json`) |
| http://localhost:4000 | API on its fixed port, for the mobile app and scripts |

The `.localhost` URLs come from [portless](https://github.com/vercel-labs/portless). The first run asks for `sudo` once to start its HTTPS proxy on port 443 and trust its local CA. Use `PORTLESS=0 pnpm dev` to skip it; the web app then runs on http://localhost:5173.

`pnpm db:reset` deletes the Docker volumes, then migrates and seeds again.

On a physical phone `localhost` is the phone itself: set `EXPO_PUBLIC_API_URL=http://<your-mac-LAN-IP>:4000` in `apps/mobile/.env.local`. The Android emulator uses `http://10.0.2.2:4000`.

Checks: `pnpm exec vp fmt --check`, `pnpm exec vp lint`, `pnpm -r typecheck`, `pnpm -r test`.

Schema changes: edit `apps/api/src/db/schema.ts`, then `pnpm --filter @team-republic/api db:generate`.

API image: `docker build -f apps/api/Dockerfile -t team-republic-api .`

## Data rules

Every stored figure references a `source_document` (the archived file, its URL and SHA-256) plus the sheet/row or page it was read from. Raw files are archived in object storage (SeaweedFS locally, S3 in production), never committed. MyNeta/ADR and TCPD Lok Dhaba data are not loaded. See `data-sources.md`.
