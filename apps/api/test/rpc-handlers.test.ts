import { describe, expect, it } from "@effect/vitest";
import {
  type CandidateId,
  type ConstituencyId,
  type ElectionId,
  ElectionRpcs,
} from "@team-republic/contracts";
import { Effect, Layer } from "effect";
import { RpcTest } from "effect/rpc";
import type { CandidacyRow } from "../src/elections/repository.ts";
import { ElectionRpcsLive } from "../src/elections/rpc-handlers.ts";
import { type InMemoryData, inMemoryRepository } from "./support/in-memory-repository.ts";

// Synthetic fixtures: names and figures are made up for tests and never shipped.
const source = {
  sourceDocumentId: "00000000-0000-0000-0000-00000000000a",
  publisher: "Test Publisher",
  title: "Synthetic fixture",
  landingUrl: "https://example.test/fixture",
  sheet: "Sheet1",
  row: 2,
};

const candidacy = (
  overrides: Partial<CandidacyRow> & Pick<CandidacyRow, "candidacyId" | "candidateId">,
) =>
  ({
    candidateNameEn: "Candidate",
    candidateNameTa: null,
    constituencyId: "ac-1",
    electionId: "test-2001",
    party: null,
    sex: null,
    age: null,
    category: null,
    generalVotes: null,
    postalVotes: null,
    totalVotes: 0,
    rank: 1,
    isWinner: false,
    source,
    ...overrides,
  }) satisfies CandidacyRow;

const fixtures: InMemoryData = {
  elections: [
    { id: "test-1996", kind: "general", year: 1996, nameEn: "Older test election", nameTa: null },
    { id: "test-2001", kind: "general", year: 2001, nameEn: "Test election", nameTa: null },
  ],
  constituencies: [
    {
      id: "ac-2",
      electionId: "test-2001",
      number: 2,
      nameEn: "Test AC Two",
      nameTa: null,
      reservation: "SC",
      districtEn: null,
      districtTa: null,
      notaVotes: null,
      source,
    },
    {
      id: "ac-1",
      electionId: "test-2001",
      number: 1,
      nameEn: "Test AC One",
      nameTa: null,
      reservation: "GEN",
      districtEn: "Test District",
      districtTa: null,
      notaVotes: 100,
      source: { ...source, row: 4 },
    },
  ],
  candidacies: [
    candidacy({
      candidacyId: "c-b",
      candidateId: "cand-b",
      candidateNameEn: "Candidate B",
      totalVotes: 300,
      rank: 2,
    }),
    candidacy({
      candidacyId: "c-a",
      candidateId: "cand-a",
      candidateNameEn: "Candidate A",
      totalVotes: 600,
      rank: 1,
      isWinner: true,
      party: { id: "p-1", abbreviation: "TP", nameEn: "Test Party", nameTa: null },
    }),
  ],
};

const run = <A, E>(
  f: (client: Effect.Success<ReturnType<typeof makeClient>>) => Effect.Effect<A, E>,
) =>
  Effect.gen(function* () {
    const client = yield* makeClient();
    return yield* f(client);
  }).pipe(Effect.provide(ElectionRpcsLive.pipe(Layer.provide(inMemoryRepository(fixtures)))));

const makeClient = () => RpcTest.makeClient(ElectionRpcs);

describe("ElectionRpcs", () => {
  it.effect("lists constituencies of the latest general election in number order", () =>
    Effect.gen(function* () {
      const list = yield* run((client) => client.ListConstituencies({}));
      expect(list.election.id).toBe("test-2001");
      expect(list.constituencies.map((c) => c.number)).toEqual([1, 2]);
      expect(list.constituencies[0]?.district).toEqual({ en: "Test District", ta: null });
      expect(list.constituencies[1]?.district).toBeNull();
    }),
  );

  it.effect("fails with ElectionNotFound for an unknown election", () =>
    Effect.gen(function* () {
      const error = yield* run((client) =>
        client.ListConstituencies({ electionId: "nope" as ElectionId }),
      ).pipe(Effect.flip);
      expect(error._tag).toBe("ElectionNotFound");
    }),
  );

  it.effect("returns ranked results with NOTA-inclusive vote share and margin", () =>
    Effect.gen(function* () {
      const result = yield* run((client) =>
        client.GetConstituencyResult({ constituencyId: "ac-1" as ConstituencyId }),
      );
      expect(result.candidates.map((c) => c.name.en)).toEqual(["Candidate A", "Candidate B"]);
      expect(result.totalVotes).toBe(1000);
      expect(result.candidates.map((c) => c.voteShare)).toEqual([60, 30]);
      expect(result.margin).toBe(300);
      expect(result.candidates[0]?.party?.abbreviation).toBe("TP");
      expect(result.candidates[1]?.party).toBeNull();
      expect(result.source).toMatchObject({ url: source.landingUrl, row: 4 });
      expect(result.candidates[0]?.source).toMatchObject({
        url: source.landingUrl,
        sheet: "Sheet1",
        row: 2,
      });
    }),
  );

  it.effect("fails with ConstituencyNotFound for an unknown constituency", () =>
    Effect.gen(function* () {
      const error = yield* run((client) =>
        client.GetConstituencyResult({ constituencyId: "missing" as ConstituencyId }),
      ).pipe(Effect.flip);
      expect(error._tag).toBe("ConstituencyNotFound");
    }),
  );

  it.effect("returns a candidate profile with an explicit not_available affidavit", () =>
    Effect.gen(function* () {
      const profile = yield* run((client) =>
        client.GetCandidateProfile({ candidateId: "cand-a" as CandidateId }),
      );
      expect(profile.name.en).toBe("Candidate A");
      expect(profile.candidacies).toHaveLength(1);
      expect(profile.candidacies[0]?.voteShare).toBe(60);
      expect(profile.candidacies[0]?.affidavit).toEqual({ status: "not_available" });
    }),
  );

  it.effect("fails with CandidateNotFound for an unknown candidate", () =>
    Effect.gen(function* () {
      const error = yield* run((client) =>
        client.GetCandidateProfile({ candidateId: "missing" as CandidateId }),
      ).pipe(Effect.flip);
      expect(error._tag).toBe("CandidateNotFound");
    }),
  );
});
