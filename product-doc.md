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

## Open questions
1. Who is the primary user?
2. What's the one job they hire this app for?
6. How to show criminal cases (strictly as declared vs plain count on cards)? User is thinking about it.
3. Free/non-commercial or commercial? Decides whether MyNeta/TCPD data can be used.
4. Seek written permission from ADR and TCPD? (not contacted yet)
5. Legal opinion on reusing ECI result data commercially.

## Decisions
- 2026-10-19: Model is free for voters + paid pro tools. Therefore core data must be commercial-safe (ECI, Form 20, data.gov.in, own affidavit parsing); MyNeta/TCPD only for cross-checking unless written permission.
- 2026-10-19: Primary MVP user is everyday Tamil voters; journalists/researchers are the paying segment.
- 2026-10-19: MVP covers both moments: pre-election candidate check and year-round MLA/MP tracking.
- 2026-10-19: MVP coverage is all of Tamil Nadu: 234 assembly + 39 Lok Sabha seats.
- 2026-10-19: Launch with full results history (Lok Sabha since 1951, TN assembly since 1967). Needs constituency lineage mapping across delimitations (1976, 2008). Affidavit data only for recent elections.
- 2026-10-19: Bilingual Tamil + English from day one; store both name forms for candidates, parties, places.
