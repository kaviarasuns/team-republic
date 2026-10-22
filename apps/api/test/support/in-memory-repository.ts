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
      latestGeneralElection: Effect.sync(
        () =>
          [...data.elections]
            .filter((e) => e.kind === "general")
            .sort((a, b) => b.year - a.year)[0] ?? null,
      ),
      findElection: (id) => Effect.sync(() => data.elections.find((e) => e.id === id) ?? null),
      listConstituencies: (electionId) =>
        Effect.sync(() => data.constituencies.filter((c) => c.electionId === electionId)),
      findConstituency: (id) => Effect.sync(() => data.constituencies.find((c) => c.id === id) ?? null),
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
