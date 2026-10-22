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

```sh
corepack enable
pnpm install
cp .env.example .env
docker compose up -d                                   # Postgres 18 + SeaweedFS (S3-compatible)
pnpm --filter @team-republic/api db:migrate            # apply drizzle migrations
pnpm --filter @team-republic/api ingest:tn2021         # load TN Assembly 2021 from ECI
pnpm --filter @team-republic/api dev                   # API on http://localhost:4000
pnpm --filter @team-republic/web dev                   # web on http://localhost:5173
pnpm --filter @team-republic/mobile dev                # Expo (press i / a / w)
```

Checks: `pnpm exec vp fmt --check`, `pnpm exec vp lint`, `pnpm -r typecheck`, `pnpm -r test`.

Schema changes: edit `apps/api/src/db/schema.ts`, then `pnpm --filter @team-republic/api db:generate`.

API image: `docker build -f apps/api/Dockerfile -t team-republic-api .`

## Data rules

Every stored figure references a `source_document` (the archived file, its URL and SHA-256) plus the sheet/row or page it was read from. Raw files are archived in object storage (SeaweedFS locally, S3 in production), never committed. MyNeta/ADR and TCPD Lok Dhaba data are not loaded. See `data-sources.md`.
