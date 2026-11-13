import { Effect, Layer } from "effect";
import {
  type AffidavitRow,
  type CandidacyRow,
  type ConstituencyRow,
  type ElectionRow,
  ElectionRepository,
} from "../../src/elections/repository.ts";

export interface InMemoryData {
  readonly elections: ReadonlyArray<ElectionRow>;
  readonly constituencies: ReadonlyArray<ConstituencyRow>;
  readonly candidacies: ReadonlyArray<CandidacyRow>;
  readonly affidavits?: ReadonlyMap<string, AffidavitRow>;
}

export const inMemoryRepository = (data: InMemoryData) =>
  Layer.succeed(
    ElectionRepository,
    ElectionRepository.of({
      listElections: Effect.sync(() => [...data.elections].sort((a, b) => b.year - a.year)),
      latestGeneralElection: Effect.sync(
        () =>
          [...data.elections]
            .filter((e) => e.kind === "general")
            .sort((a, b) => b.year - a.year)[0] ?? null,
      ),
      findElection: (id) => Effect.sync(() => data.elections.find((e) => e.id === id) ?? null),
      listConstituencies: (electionId) =>
        Effect.sync(() => data.constituencies.filter((c) => c.electionId === electionId)),
      findConstituency: (id) =>
        Effect.sync(() => data.constituencies.find((c) => c.id === id) ?? null),
      listElectionCandidacies: (electionId) =>
        Effect.sync(() => data.candidacies.filter((c) => c.electionId === electionId)),
      partySeatTotals: Effect.sync(() => {
        const general = new Set(
          data.elections.filter((e) => e.kind === "general").map((e) => e.id),
        );
        const totals = new Map<
          string,
          { party: NonNullable<CandidacyRow["party"]>; seats: number }
        >();
        for (const row of data.candidacies) {
          if (!row.isWinner || row.party === null || !general.has(row.electionId)) continue;
          const entry = totals.get(row.party.id) ?? { party: row.party, seats: 0 };
          totals.set(row.party.id, { ...entry, seats: entry.seats + 1 });
        }
        return [...totals.values()];
      }),
      listCandidacies: (constituencyId) =>
        Effect.sync(() => data.candidacies.filter((c) => c.constituencyId === constituencyId)),
      findCandidate: (id) =>
        Effect.sync(() => {
          const row = data.candidacies.find((c) => c.candidateId === id);
          return row === undefined
            ? null
            : { id: row.candidateId, nameEn: row.candidateNameEn, nameTa: row.candidateNameTa };
        }),
      listCandidaciesForCandidate: (candidateId) =>
        Effect.sync(() => data.candidacies.filter((c) => c.candidateId === candidateId)),
      findAffidavit: (candidacyId) => Effect.sync(() => data.affidavits?.get(candidacyId) ?? null),
    }),
  );
