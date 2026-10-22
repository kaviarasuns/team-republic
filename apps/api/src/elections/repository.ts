import type { Reservation } from "@team-republic/contracts";
import { Context, type Effect } from "effect";

export interface SourceRow {
  readonly sourceDocumentId: string;
  readonly publisher: string;
  readonly title: string;
  readonly landingUrl: string;
  readonly sheet: string | null;
  readonly row: number | null;
}

export interface ElectionRow {
  readonly id: string;
  readonly kind: "general" | "bye";
  readonly year: number;
  readonly nameEn: string | null;
  readonly nameTa: string | null;
}

export interface ConstituencyRow {
  readonly id: string;
  readonly electionId: string;
  readonly number: number;
  readonly nameEn: string | null;
  readonly nameTa: string | null;
  readonly reservation: Reservation | null;
  readonly districtEn: string | null;
  readonly districtTa: string | null;
  readonly notaVotes: number | null;
  readonly source: SourceRow;
}

export interface PartyRow {
  readonly id: string;
  readonly abbreviation: string;
  readonly nameEn: string | null;
  readonly nameTa: string | null;
}

export interface CandidacyRow {
  readonly candidacyId: string;
  readonly candidateId: string;
  readonly candidateNameEn: string | null;
  readonly candidateNameTa: string | null;
  readonly constituencyId: string;
  readonly electionId: string;
  readonly party: PartyRow | null;
  readonly sex: string | null;
  readonly age: number | null;
  readonly category: string | null;
  readonly generalVotes: number | null;
  readonly postalVotes: number | null;
  readonly totalVotes: number;
  readonly rank: number;
  readonly isWinner: boolean;
  readonly source: SourceRow;
}

export interface AffidavitRow {
  readonly document: SourceRow;
  readonly assetsRupees: number | null;
  readonly assetsPage: number | null;
  readonly liabilitiesRupees: number | null;
  readonly liabilitiesPage: number | null;
  readonly education: string | null;
  readonly educationPage: number | null;
  readonly criminalCases: ReadonlyArray<{
    readonly description: string;
    readonly status: "pending" | "convicted";
    readonly page: number;
  }>;
}

/** Read access to stored results. Implementations: Drizzle (live) and in-memory (tests). */
export class ElectionRepository extends Context.Service<
  ElectionRepository,
  {
    readonly latestGeneralElection: Effect.Effect<ElectionRow | null>;
    readonly findElection: (id: string) => Effect.Effect<ElectionRow | null>;
    readonly listConstituencies: (
      electionId: string,
    ) => Effect.Effect<ReadonlyArray<ConstituencyRow>>;
    readonly findConstituency: (id: string) => Effect.Effect<ConstituencyRow | null>;
    readonly listCandidacies: (
      constituencyId: string,
    ) => Effect.Effect<ReadonlyArray<CandidacyRow>>;
    readonly findCandidate: (id: string) => Effect.Effect<{
      readonly id: string;
      readonly nameEn: string | null;
      readonly nameTa: string | null;
    } | null>;
    readonly listCandidaciesForCandidate: (
      candidateId: string,
    ) => Effect.Effect<ReadonlyArray<CandidacyRow>>;
    readonly findAffidavit: (candidacyId: string) => Effect.Effect<AffidavitRow | null>;
  }
>()("ElectionRepository") {}
