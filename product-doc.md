# Team Republic — Product Doc (working name)

_Last updated: 2026-10-19_

## Vision
A politically neutral app for Indian election history and candidate information, starting with Tamil Nadu and India.

## Personas
- Primary (free): everyday Tamil voters, mobile-first, Tamil language.
- Paying: journalists and researchers (pro tools, exports, API).

## Problem it solves
Two voter moments, both MVP: (1) checking candidates before polling day; (2) tracking the current MLA/MP year-round.

## Differentiation (vs MyNeta/ADR, ECI, IndiaVotes, Lok Dhaba)
_TBD._

## Features
### MVP
_TBD._
### V2
_TBD._
### Later
Candidate ideas to discuss: constituency pages, candidate comparison, vote-swing maps, alliance history, manifesto tracker, assembly/parliament attendance and questions, Tamil-language support, election-night live results, alerts, shareable cards.

## Data sources
See `data-sources.md`. Key finding: MyNeta/ADR and TCPD Lok Dhaba are non-commercial only; PRS terms are contradictory. Commercial-safe core: ECI XLSX statistical reports, data.gov.in (GODL), TN Form 20 PDFs, own affidavit parsing from ECI portal, DataMeet maps (CC BY 4.0).

## Monetisation
Free app for voters; paid professional tools (booth-level analysis, exports, API) for media/researchers; possible media widget licensing. Avoid political ads and party consulting to protect neutrality.

## Neutrality & legal
_TBD._

## Tech stack (default assumptions)
Expo/React Native (mobile first), Next.js web, NestJS or Spring Boot API, PostgreSQL + Prisma.

### Real-time design for live results
Inspired by [pingdotgg/t3code](https://github.com/pingdotgg/t3code). t3code keeps an event log in a database: commands are recorded first, and a separate worker handles side effects afterward. Clients connect over authenticated RPC on a socket and subscribe per page, so each client only receives updates for what it is viewing. We are adopting this event-log-plus-subscription pattern for live election results.

Note: t3code itself uses Effect's SQL client with raw SQL on SQLite, no ORM. We took the pattern, not the library.

**Backend stack (decided 2026-10-21):** Hono (not Fastify, not NestJS) with Drizzle on Postgres (not Prisma).

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
- 2026-10-19: MVP covers both moments: pre-election candidate check and year-round MLA/MP tracking.
- 2026-10-19: MVP coverage is all of Tamil Nadu: 234 assembly + 39 Lok Sabha seats. (Superseded 2026-10-21.)
- 2026-10-19: Launch with full results history (Lok Sabha since 1951, TN assembly since 1967). Needs constituency lineage mapping across delimitations (1976, 2008). Affidavit data only for recent elections.
- 2026-10-19: Bilingual Tamil + English from day one; store both name forms for candidates, parties, places.
- 2026-10-21: MVP scope is Tamil Nadu only for v1: Tamil Nadu Assembly election results first, not Lok Sabha.
- 2026-10-21: v1 ships both raw TN Assembly results (winner, party, vote share per constituency) AND candidate profiles with affidavit data (assets, liabilities, criminal cases, education) in the same release.
- 2026-10-21: Kaviarasu shared pingdotgg/t3code during the 7 PM call and chose to explore it as possible inspiration beyond the existing NestJS stack; the live-results design adopts its event-log-plus-subscription pattern.
- 2026-10-21: Backend locked to Hono (not Fastify or NestJS) and Drizzle on Postgres (not Prisma), decided on the 7 PM call. Kaviarasu was open to going beyond the existing NestJS stack, looked at pingdotgg/t3code for the real-time event-log pattern, and after comparing Hono vs Fastify chose Hono for its edge-readiness and portability.
