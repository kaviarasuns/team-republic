import { and, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Effect, Layer } from "effect";
import { Database } from "../db/database.ts";
import * as t from "../db/schema.ts";
import { type CandidacyRow, ElectionRepository } from "./repository.ts";

const candidacyColumns = {
  candidacyId: t.candidacy.id,
  candidateId: t.candidacy.candidateId,
  candidateNameEn: t.candidate.nameEn,
  candidateNameTa: t.candidate.nameTa,
  constituencyId: t.candidacy.constituencyId,
  electionId: t.candidacy.electionId,
  partyId: t.party.id,
  partyAbbreviation: t.party.abbreviation,
  partyNameEn: t.party.nameEn,
  partyNameTa: t.party.nameTa,
  sex: t.candidacy.sex,
  age: t.candidacy.age,
  category: t.candidacy.category,
  generalVotes: t.candidacy.generalVotes,
  postalVotes: t.candidacy.postalVotes,
  totalVotes: t.candidacy.totalVotes,
  rank: t.candidacy.rank,
  isWinner: t.candidacy.isWinner,
  sourceDocumentId: t.sourceDocument.id,
  publisher: t.sourceDocument.publisher,
  title: t.sourceDocument.title,
  landingUrl: t.sourceDocument.landingUrl,
  sheet: t.candidacy.sourceSheet,
  row: t.candidacy.sourceRow,
};

type CandidacySelect = {
  [K in keyof typeof candidacyColumns]: (typeof candidacyColumns)[K]["_"]["data"] | null;
};

const toCandidacyRow = (r: CandidacySelect): CandidacyRow => ({
  candidacyId: r.candidacyId!,
  candidateId: r.candidateId!,
  candidateNameEn: r.candidateNameEn,
  candidateNameTa: r.candidateNameTa,
  constituencyId: r.constituencyId!,
  electionId: r.electionId!,
  party:
    r.partyId === null
      ? null
      : {
          id: r.partyId,
          abbreviation: r.partyAbbreviation!,
          nameEn: r.partyNameEn,
          nameTa: r.partyNameTa,
        },
  sex: r.sex,
  age: r.age,
  category: r.category,
  generalVotes: r.generalVotes,
  postalVotes: r.postalVotes,
  totalVotes: r.totalVotes ?? 0,
  rank: r.rank ?? 0,
  isWinner: r.isWinner ?? false,
  source: {
    sourceDocumentId: r.sourceDocumentId!,
    publisher: r.publisher!,
    title: r.title!,
    landingUrl: r.landingUrl!,
    sheet: r.sheet,
    row: r.row,
  },
});

const electionColumns = {
  id: t.election.id,
  kind: t.election.kind,
  year: t.election.year,
  nameEn: t.election.nameEn,
  nameTa: t.election.nameTa,
};

const constituencyColumns = {
  id: t.constituency.id,
  electionId: t.constituency.electionId,
  number: t.constituency.number,
  nameEn: t.constituency.nameEn,
  nameTa: t.constituency.nameTa,
  reservation: t.constituency.reservation,
  districtEn: t.constituency.districtEn,
  districtTa: t.constituency.districtTa,
  notaVotes: t.constituency.notaVotes,
};

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const ElectionRepositoryDrizzle = Layer.effect(
  ElectionRepository,
  Effect.gen(function* () {
    const db = yield* Database;
    // Repository reads are infallible to callers; a database failure is a defect.
    const run = <A, E>(query: Effect.Effect<A, E>) => query.pipe(Effect.orDie);

    const selectCandidacies = () =>
      db
        .select(candidacyColumns)
        .from(t.candidacy)
        .innerJoin(t.candidate, eq(t.candidate.id, t.candidacy.candidateId))
        .innerJoin(t.sourceDocument, eq(t.sourceDocument.id, t.candidacy.sourceDocumentId))
        .leftJoin(t.party, eq(t.party.id, t.candidacy.partyId));

    const affidavitSource = alias(t.sourceDocument, "affidavit_source");

    return ElectionRepository.of({
      latestGeneralElection: run(
        db
          .select(electionColumns)
          .from(t.election)
          .where(eq(t.election.kind, "general"))
          .orderBy(desc(t.election.year))
          .limit(1),
      ).pipe(Effect.map((rows) => rows[0] ?? null)),

      findElection: (id) =>
        run(db.select(electionColumns).from(t.election).where(eq(t.election.id, id))).pipe(
          Effect.map((rows) => rows[0] ?? null),
        ),

      listConstituencies: (electionId) =>
        run(
          db
            .select(constituencyColumns)
            .from(t.constituency)
            .where(eq(t.constituency.electionId, electionId))
            .orderBy(t.constituency.number),
        ),

      findConstituency: (id) =>
        isUuid(id)
          ? run(
              db.select(constituencyColumns).from(t.constituency).where(eq(t.constituency.id, id)),
            ).pipe(Effect.map((rows) => rows[0] ?? null))
          : Effect.succeed(null),

      listCandidacies: (constituencyId) =>
        isUuid(constituencyId)
          ? run(
              selectCandidacies().where(
                and(
                  eq(t.candidacy.constituencyId, constituencyId),
                  eq(t.candidacy.status, "result"),
                ),
              ),
            ).pipe(Effect.map((rows) => rows.map(toCandidacyRow)))
          : Effect.succeed([]),

      findCandidate: (id) =>
        isUuid(id)
          ? run(
              db
                .select({
                  id: t.candidate.id,
                  nameEn: t.candidate.nameEn,
                  nameTa: t.candidate.nameTa,
                })
                .from(t.candidate)
                .where(eq(t.candidate.id, id)),
            ).pipe(Effect.map((rows) => rows[0] ?? null))
          : Effect.succeed(null),

      listCandidaciesForCandidate: (candidateId) =>
        isUuid(candidateId)
          ? run(
              selectCandidacies().where(
                and(eq(t.candidacy.candidateId, candidateId), eq(t.candidacy.status, "result")),
              ),
            ).pipe(Effect.map((rows) => rows.map(toCandidacyRow)))
          : Effect.succeed([]),

      findAffidavit: (candidacyId) =>
        Effect.gen(function* () {
          const rows = yield* run(
            db
              .select({
                id: t.affidavit.id,
                assetsRupees: t.affidavit.assetsRupees,
                assetsPage: t.affidavit.assetsPage,
                liabilitiesRupees: t.affidavit.liabilitiesRupees,
                liabilitiesPage: t.affidavit.liabilitiesPage,
                education: t.affidavit.education,
                educationPage: t.affidavit.educationPage,
                sourceDocumentId: affidavitSource.id,
                publisher: affidavitSource.publisher,
                title: affidavitSource.title,
                landingUrl: affidavitSource.landingUrl,
              })
              .from(t.affidavit)
              .innerJoin(affidavitSource, eq(affidavitSource.id, t.affidavit.sourceDocumentId))
              .where(eq(t.affidavit.candidacyId, candidacyId)),
          );
          const row = rows[0];
          if (row === undefined) return null;
          const cases = yield* run(
            db
              .select({
                description: t.affidavitCriminalCase.description,
                status: t.affidavitCriminalCase.status,
                page: t.affidavitCriminalCase.page,
              })
              .from(t.affidavitCriminalCase)
              .where(eq(t.affidavitCriminalCase.affidavitId, row.id)),
          );
          return {
            document: {
              sourceDocumentId: row.sourceDocumentId,
              publisher: row.publisher,
              title: row.title,
              landingUrl: row.landingUrl,
              sheet: null,
              row: null,
            },
            assetsRupees: row.assetsRupees,
            assetsPage: row.assetsPage,
            liabilitiesRupees: row.liabilitiesRupees,
            liabilitiesPage: row.liabilitiesPage,
            education: row.education,
            educationPage: row.educationPage,
            criminalCases: cases,
          };
        }),
    });
  }),
);
