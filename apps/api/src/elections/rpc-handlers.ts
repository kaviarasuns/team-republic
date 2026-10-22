import {
  type Affidavit,
  type CandidateId,
  CandidateNotFound,
  type ConstituencyId,
  ConstituencyNotFound,
  type ConstituencySummary,
  DataUnavailable,
  type Election,
  type ElectionId,
  ElectionNotFound,
  ElectionRpcs,
  type Party,
  type PartyId,
  type SourceDocumentId,
  type SourceRef,
} from "@team-republic/contracts";
import { Effect } from "effect";
import {
  type AffidavitRow,
  type CandidacyRow,
  type ConstituencyRow,
  type ElectionRow,
  ElectionRepository,
  type PartyRow,
  type SourceRow,
} from "./repository.ts";
import { constituencyTotal, margin, voteShare } from "./result-math.ts";

const toSourceRef = (source: SourceRow, page: number | null = null): SourceRef => ({
  sourceDocumentId: source.sourceDocumentId as SourceDocumentId,
  publisher: source.publisher,
  title: source.title,
  url: source.landingUrl,
  sheet: source.sheet,
  row: source.row,
  page,
});

const toElection = (row: ElectionRow): Election => ({
  id: row.id as ElectionId,
  kind: row.kind,
  year: row.year,
  name: { en: row.nameEn, ta: row.nameTa },
});

const toConstituency = (row: ConstituencyRow): ConstituencySummary => ({
  id: row.id as ConstituencyId,
  number: row.number,
  name: { en: row.nameEn, ta: row.nameTa },
  reservation: row.reservation,
  district:
    row.districtEn === null && row.districtTa === null
      ? null
      : { en: row.districtEn, ta: row.districtTa },
});

const toParty = (row: PartyRow | null): Party | null =>
  row === null
    ? null
    : {
        id: row.id as PartyId,
        abbreviation: row.abbreviation,
        name: { en: row.nameEn, ta: row.nameTa },
      };

const toAffidavit = (row: AffidavitRow | null): Affidavit => {
  if (row === null) return { status: "not_available" };
  const at = (page: number | null) => toSourceRef(row.document, page);
  return {
    status: "available",
    assets:
      row.assetsRupees === null ? null : { rupees: row.assetsRupees, source: at(row.assetsPage) },
    liabilities:
      row.liabilitiesRupees === null
        ? null
        : { rupees: row.liabilitiesRupees, source: at(row.liabilitiesPage) },
    education:
      row.education === null ? null : { declared: row.education, source: at(row.educationPage) },
    criminalCases: row.criminalCases.map((c) => ({
      description: c.description,
      status: c.status,
      source: at(c.page),
    })),
    document: at(null),
  };
};

const byRank = (a: CandidacyRow, b: CandidacyRow) => a.rank - b.rank;

export const ElectionRpcsLive = ElectionRpcs.toLayer(
  Effect.gen(function* () {
    const repo = yield* ElectionRepository;

    return {
      ListConstituencies: ({ electionId }) =>
        Effect.gen(function* () {
          const election =
            electionId === undefined
              ? yield* repo.latestGeneralElection
              : yield* repo.findElection(electionId);
          if (election === null) {
            return yield* electionId === undefined
              ? new DataUnavailable({ message: "No election has been ingested yet." })
              : new ElectionNotFound({ electionId });
          }
          const constituencies = yield* repo.listConstituencies(election.id);
          return {
            election: toElection(election),
            constituencies: [...constituencies]
              .sort((a, b) => a.number - b.number)
              .map(toConstituency),
          };
        }),

      GetConstituencyResult: ({ constituencyId }) =>
        Effect.gen(function* () {
          const constituency = yield* repo.findConstituency(constituencyId);
          if (constituency === null) return yield* new ConstituencyNotFound({ constituencyId });
          const election = yield* repo.findElection(constituency.electionId);
          if (election === null) return yield* new ConstituencyNotFound({ constituencyId });
          const rows = [...(yield* repo.listCandidacies(constituencyId))].sort(byRank);
          const total = constituencyTotal(rows, constituency.notaVotes);
          return {
            election: toElection(election),
            constituency: toConstituency(constituency),
            candidates: rows.map((row) => ({
              candidateId: row.candidateId as CandidateId,
              name: { en: row.candidateNameEn, ta: row.candidateNameTa },
              party: toParty(row.party),
              generalVotes: row.generalVotes,
              postalVotes: row.postalVotes,
              totalVotes: row.totalVotes,
              voteShare: voteShare(row.totalVotes, total),
              rank: row.rank,
              isWinner: row.isWinner,
              source: toSourceRef(row.source),
            })),
            notaVotes: constituency.notaVotes,
            totalVotes: total,
            margin: margin(rows),
          };
        }),

      GetCandidateProfile: ({ candidateId }) =>
        Effect.gen(function* () {
          const candidate = yield* repo.findCandidate(candidateId);
          if (candidate === null) return yield* new CandidateNotFound({ candidateId });
          const candidacies = yield* repo.listCandidaciesForCandidate(candidateId);
          const enriched = yield* Effect.forEach(candidacies, (row) =>
            Effect.gen(function* () {
              const [election, constituency, siblings, affidavit] = yield* Effect.all([
                repo.findElection(row.electionId),
                repo.findConstituency(row.constituencyId),
                repo.listCandidacies(row.constituencyId),
                repo.findAffidavit(row.candidacyId),
              ]);
              if (election === null || constituency === null) return [];
              const total = constituencyTotal(siblings, constituency.notaVotes);
              return [
                {
                  election: toElection(election),
                  constituency: toConstituency(constituency),
                  party: toParty(row.party),
                  totalVotes: row.totalVotes,
                  voteShare: voteShare(row.totalVotes, total),
                  rank: row.rank,
                  isWinner: row.isWinner,
                  sex: row.sex,
                  age: row.age,
                  category: row.category,
                  source: toSourceRef(row.source),
                  affidavit: toAffidavit(affidavit),
                },
              ];
            }),
          );
          return {
            id: candidate.id as CandidateId,
            name: { en: candidate.nameEn, ta: candidate.nameTa },
            candidacies: enriched.flat().sort((a, b) => b.election.year - a.election.year),
          };
        }),
    };
  }),
);
