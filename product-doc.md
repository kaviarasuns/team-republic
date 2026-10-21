# Team Republic — Product Doc (working name)

_Last updated: 2026-10-21_

## Vision
A politically neutral app for Indian election history and candidate information, starting with Tamil Nadu and India.

## Personas
- Primary (free): everyday Tamil voters, mobile-first, Tamil language.
- Paying: journalists and researchers (pro tools, exports, API).

## Problem it solves
Two voter moments are both in v1. Before polling day, a voter checks the candidates. Through the year, a voter tracks the current MLA. v1 does not track the MP.

## Differentiation (vs MyNeta/ADR, ECI, IndiaVotes, Lok Dhaba)
_TBD._

## Features
### MVP
v1 is the phone app for an everyday Tamil voter. It covers the Tamil Nadu Assembly only. It does not cover Lok Sabha. Open question 7 still asks whether Tamil Nadu Lok Sabha results are V2 or later.

The voter can find a constituency, check the candidates before polling day, and see the sitting MLA for the rest of the year.

- A constituency result covers every Tamil Nadu Assembly general election in the ECI statistical-report index from 1967 through the latest listed year. For each constituency in that report, the screen shows the winner, the winner's party, and the vote share. Vote share is computed from the candidate votes in that file.
- The same result lists every candidate in the ECI detailed-results file for that constituency, with the party and the votes that file records.
- A bye-election in an ECI bye-election report replaces the sitting winner for that constituency.
- Each election keeps the constituency name and number printed in that election's report. v1 does not join one constituency across the 1976 delimitation or the 2008 delimitation. `data-sources.md` has no commercial-safe lineage table.
- Before that election's statistical report exists, the constituency lists candidates marked Contesting on the ECI affidavit portal.
- A candidate profile shows assets, liabilities, education, and criminal cases from that candidate's affidavit PDF. It does not show an address, a phone number, a family PAN, or a signature.
- Affidavit profiles cover elections on the ECI affidavit portal, which opened on 10 March 2019. An earlier election is included only where old.eci.gov.in still links the affidavit. v1 does not add an affidavit profile when neither site has the file.
- Whether a card shows a plain case count or only the declared list is open question 6.
- The constituency shows the sitting MLA. That person is the latest general-election winner, or the winner of a later bye-election in the ECI reports. v1 does not show the MP.
- The app is in Tamil and in English. It stores a Tamil name and an English name for a candidate, a party, and a place when the government file contains that form. If the file has one language, that form is stored and the other name stays empty.
- When a new official result is stored, an open constituency screen updates from the event log under Tech stack. The number still comes from an ECI statistical report or an ECI bye-election report.
- Every result figure links to the ECI file it came from. Every affidavit figure links to the affidavit PDF it came from.

v1 does not load MyNeta or TCPD Lok Dhaba. Staff may cross-check a figure against those sites by hand. Written permission is open question 4.

v1 reads a data.gov.in dataset only when `data-sources.md` lists that dataset under GODL. The listed GODL sets do not replace the ECI Tamil Nadu Assembly reports.

v1 leaves these out.

- Lok Sabha results and MP pages.
- Booth-level Form 20 views, exports, and an API.
- A constituency map. DataMeet assembly boundaries remain available for a later map.
- Counting-day pages from results.eci.gov.in.
- Candidate comparison, vote-swing maps, alliance history, a manifesto tracker, assembly attendance and questions, alerts, and shareable cards.

### V2
_TBD._
### Later
Ideas still to discuss: candidate comparison, vote-swing maps, alliance history, a manifesto tracker, assembly and parliament attendance and questions, alerts, and shareable cards.

## Data sources
See `data-sources.md`. Key finding: MyNeta/ADR and TCPD Lok Dhaba are non-commercial only; PRS terms are contradictory. Commercial-safe core: ECI XLSX statistical reports, data.gov.in (GODL), TN Form 20 PDFs, own affidavit parsing from ECI portal, DataMeet maps (CC BY 4.0).

## Monetisation
Free app for voters; paid professional tools (booth-level analysis, exports, API) for media/researchers; possible media widget licensing. Avoid political ads and party consulting to protect neutrality.

## Neutrality & legal
_TBD._

## Tech stack
Build the Final stack section below. That decision is from 2026-10-21. Next.js, NestJS, Spring Boot, and Prisma are retired. Mobile stays on Expo, as that section specifies.

### Real-time design for live results
Inspired by [pingdotgg/t3code](https://github.com/pingdotgg/t3code). t3code keeps an event log in a database: commands are recorded first, and a separate worker handles side effects afterward. Clients connect over authenticated RPC on a socket and subscribe per page, so each client only receives updates for what it is viewing. We are adopting this event-log-plus-subscription pattern for live election results.

Note: t3code itself uses Effect's SQL client with raw SQL on SQLite, no ORM. We took the pattern, not the library.

**Backend stack (decided 2026-10-21, superseded later that day by the final stack below):** Hono with Drizzle on Postgres.

### Final stack (decided 2026-10-21, re-checked against what t3code ships)

**Foundation:** TypeScript everywhere, in a pnpm + Vite+ monorepo. Vite+ replaces Turborepo and Biome, since it bundles the task runner, Vitest, oxlint and oxfmt.

**Shared packages**
- `packages/contracts`: Effect Schema types, typed errors and RPC definitions.
- `packages/client`: Effect RPC client plus `@effect/atom-react` state, shared by web and mobile.

**Backend (`apps/api`)**
- Runtime: Node in a single Docker image, built on Effect v4 services and Layers.
- API: Effect RPC for our own apps; Effect HttpApi for public routes and webhooks.
- Database: Postgres with Drizzle's effect-postgres driver; migrations via drizzle-kit.
- Jobs: Postgres outbox (SKIP LOCKED) plus an Effect worker fiber.
- Auth: Better Auth with its Drizzle adapter (tables live in our schema and migrations), plus a CurrentUser RPC middleware.
- Config and observability: Effect Config and Effect's built-in OTLP exporter (`effect/observability/OtlpTracer`), no separate OpenTelemetry SDK.
- Tests: `@effect/vitest` with in-memory Layers.

**Web (`apps/web`):** React, Vite, TanStack Router, Tailwind 4.

**Mobile (`apps/mobile`):** Expo with Expo Router, uniwind (Tailwind for React Native, shared styling with web) and Legend List for long lists; expo-notifications for push, sent from the outbox worker; EAS for builds and over-the-air updates.

**Risk note:** Effect v4, Drizzle 1.0 and Vite+ are all new. Pin exact versions and upgrade deliberately. Keep the outbox and event log as plain SQL so they stay portable.

## Open questions
1. Who is the primary user?
2. What's the one job they hire this app for?
7. Should Lok Sabha Tamil Nadu results be V2 or later?
6. How to show criminal cases (strictly as declared vs plain count on cards)? User is thinking about it.
3. Free/non-commercial or commercial? Decides whether MyNeta/TCPD data can be used.
4. Seek written permission from ADR and TCPD? (not contacted yet)
5. Legal opinion on reusing ECI result data commercially.

## Decisions
- 2026-10-19: Model is free for voters + paid pro tools. Therefore core data must be commercial-safe (ECI, Form 20, data.gov.in, own affidavit parsing); MyNeta/TCPD only for cross-checking unless written permission.
- 2026-10-19: Primary MVP user is everyday Tamil voters; journalists/researchers are the paying segment.
- 2026-10-19: MVP covers both moments: pre-election candidate check and year-round MLA/MP tracking. (MP tracking superseded 2026-10-21. v1 tracks the sitting MLA only.)
- 2026-10-19: MVP coverage is all of Tamil Nadu: 234 assembly + 39 Lok Sabha seats. (Superseded 2026-10-21.)
- 2026-10-19: Launch with full results history (Lok Sabha since 1951, TN assembly since 1967). Needs constituency lineage mapping across delimitations (1976, 2008). Affidavit data only for recent elections.
- 2026-10-19: Bilingual Tamil + English from day one; store both name forms for candidates, parties, places.
- 2026-10-21: MVP scope is Tamil Nadu only for v1: Tamil Nadu Assembly election results first, not Lok Sabha.
- 2026-10-21: v1 ships both raw TN Assembly results (winner, party, vote share per constituency) AND candidate profiles with affidavit data (assets, liabilities, criminal cases, education) in the same release.
- 2026-10-21: Kaviarasu shared pingdotgg/t3code during the 7 PM call and chose to explore it as possible inspiration beyond the existing NestJS stack; the live-results design adopts its event-log-plus-subscription pattern.
- 2026-10-21: Backend locked to Hono (not Fastify or NestJS) and Drizzle on Postgres (not Prisma), decided on the 7 PM call. Kaviarasu was open to going beyond the existing NestJS stack, looked at pingdotgg/t3code for the real-time event-log pattern, and after comparing Hono vs Fastify chose Hono for its edge-readiness and portability. (Superseded 2026-10-21 by the final Effect stack.)
- 2026-10-21: Final stack locked: Effect v4 backend (Effect RPC + HttpApi) with Drizzle on Postgres, Better Auth, Postgres outbox; React/Vite/TanStack Router web; Expo with uniwind and Legend List mobile; pnpm + Vite+ monorepo. Supersedes the earlier Hono decision. See Tech stack > Final stack.
- 2026-10-21: The MVP section is the v1 feature list. It is the Tamil Nadu Assembly voter loop only. Pro tools, Form 20 booth views, maps, delimitation lineage, and counting-day pages on results.eci.gov.in are outside that list.
- 2026-10-21: The Tech stack opening assumptions are retired. Next.js, NestJS, Spring Boot, and Prisma are not the build target. Build the Final stack section. Mobile stays on Expo.
