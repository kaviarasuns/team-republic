import { Schema } from "effect";

export const ElectionId = Schema.String.pipe(Schema.brand("ElectionId"));
export type ElectionId = typeof ElectionId.Type;

export const ConstituencyId = Schema.String.pipe(Schema.brand("ConstituencyId"));
export type ConstituencyId = typeof ConstituencyId.Type;

export const CandidateId = Schema.String.pipe(Schema.brand("CandidateId"));
export type CandidateId = typeof CandidateId.Type;

export const PartyId = Schema.String.pipe(Schema.brand("PartyId"));
export type PartyId = typeof PartyId.Type;

export const SourceDocumentId = Schema.String.pipe(Schema.brand("SourceDocumentId"));
export type SourceDocumentId = typeof SourceDocumentId.Type;

/**
 * A name as printed in a government file. A language is null when the file
 * does not contain that form; it is never transliterated or translated.
 */
export const LocalizedName = Schema.Struct({
  en: Schema.NullOr(Schema.String),
  ta: Schema.NullOr(Schema.String),
});
export type LocalizedName = typeof LocalizedName.Type;

/** Points a figure back to the exact file, and the place inside it, it came from. */
export const SourceRef = Schema.Struct({
  sourceDocumentId: SourceDocumentId,
  publisher: Schema.String,
  title: Schema.String,
  url: Schema.String,
  sheet: Schema.NullOr(Schema.String),
  row: Schema.NullOr(Schema.Number),
  page: Schema.NullOr(Schema.Number),
});
export type SourceRef = typeof SourceRef.Type;

export const ElectionKind = Schema.Literals(["general", "bye"]);
export type ElectionKind = typeof ElectionKind.Type;

export const Election = Schema.Struct({
  id: ElectionId,
  kind: ElectionKind,
  year: Schema.Number,
  name: LocalizedName,
});
export type Election = typeof Election.Type;

export const Reservation = Schema.Literals(["GEN", "SC", "ST"]);
export type Reservation = typeof Reservation.Type;

export const ConstituencySummary = Schema.Struct({
  id: ConstituencyId,
  number: Schema.Number,
  name: LocalizedName,
  reservation: Schema.NullOr(Reservation),
  district: Schema.NullOr(LocalizedName),
});
export type ConstituencySummary = typeof ConstituencySummary.Type;

export const Party = Schema.Struct({
  id: PartyId,
  abbreviation: Schema.String,
  name: LocalizedName,
});
export type Party = typeof Party.Type;

export const ResultRow = Schema.Struct({
  candidateId: CandidateId,
  name: LocalizedName,
  /** Null for an independent candidate. */
  party: Schema.NullOr(Party),
  generalVotes: Schema.NullOr(Schema.Number),
  postalVotes: Schema.NullOr(Schema.Number),
  totalVotes: Schema.Number,
  /** Percent of all votes recorded for this constituency in the file, NOTA included. */
  voteShare: Schema.Number,
  rank: Schema.Number,
  isWinner: Schema.Boolean,
  source: SourceRef,
});
export type ResultRow = typeof ResultRow.Type;

export const ConstituencyResult = Schema.Struct({
  election: Election,
  constituency: ConstituencySummary,
  candidates: Schema.Array(ResultRow),
  notaVotes: Schema.NullOr(Schema.Number),
  totalVotes: Schema.Number,
  /** Winner's votes minus the runner-up's votes. Null when there is no runner-up. */
  margin: Schema.NullOr(Schema.Number),
  /**
   * Where the constituency's own line (NOTA) is printed. Total and margin are
   * computed from the candidate rows of this same document.
   */
  source: SourceRef,
});
export type ConstituencyResult = typeof ConstituencyResult.Type;

/** Every stored election, newest year first. */
export const ElectionList = Schema.Struct({
  elections: Schema.Array(Election),
});
export type ElectionList = typeof ElectionList.Type;

export const ConstituencyList = Schema.Struct({
  election: Election,
  constituencies: Schema.Array(ConstituencySummary),
});
export type ConstituencyList = typeof ConstituencyList.Type;

/** One constituency on the election map: who won and by how much. */
export const ConstituencyOutcome = Schema.Struct({
  constituency: ConstituencySummary,
  /** Null when the file records no winner for the constituency. */
  winner: Schema.NullOr(
    Schema.Struct({
      candidateId: CandidateId,
      name: LocalizedName,
      /** Null for an independent candidate. */
      party: Schema.NullOr(Party),
      totalVotes: Schema.Number,
      /** Percent of all votes recorded for the constituency, NOTA included. */
      voteShare: Schema.Number,
    }),
  ),
  /** Every vote line in the file for the constituency, NOTA included. */
  totalVotes: Schema.Number,
  /** Winner's votes minus the runner-up's votes. Null when there is no runner-up. */
  margin: Schema.NullOr(Schema.Number),
  /** The margin as a percent of totalVotes. Null when margin is null. */
  marginShare: Schema.NullOr(Schema.Number),
});
export type ConstituencyOutcome = typeof ConstituencyOutcome.Type;

export const PartySeats = Schema.Struct({
  party: Party,
  seats: Schema.Number,
});
export type PartySeats = typeof PartySeats.Type;

export const ElectionMap = Schema.Struct({
  election: Election,
  /** In constituency-number order. */
  constituencies: Schema.Array(ConstituencyOutcome),
  /**
   * Seats each party won across every stored general election, most first.
   * It does not change with the election shown, so a client can give a party
   * the same map colour in every year.
   */
  partySeatTotals: Schema.Array(PartySeats),
});
export type ElectionMap = typeof ElectionMap.Type;

export const Money = Schema.Struct({
  /** Whole rupees as declared in the affidavit. */
  rupees: Schema.Number,
  source: SourceRef,
});

export const CriminalCase = Schema.Struct({
  description: Schema.String,
  status: Schema.Literals(["pending", "convicted"]),
  source: SourceRef,
});

export const Affidavit = Schema.Union([
  Schema.Struct({ status: Schema.Literal("not_available") }),
  Schema.Struct({
    status: Schema.Literal("available"),
    assets: Schema.NullOr(Money),
    liabilities: Schema.NullOr(Money),
    education: Schema.NullOr(Schema.Struct({ declared: Schema.String, source: SourceRef })),
    criminalCases: Schema.Array(CriminalCase),
    document: SourceRef,
  }),
]);
export type Affidavit = typeof Affidavit.Type;

export const Candidacy = Schema.Struct({
  election: Election,
  constituency: ConstituencySummary,
  party: Schema.NullOr(Party),
  totalVotes: Schema.Number,
  voteShare: Schema.Number,
  rank: Schema.Number,
  isWinner: Schema.Boolean,
  sex: Schema.NullOr(Schema.String),
  age: Schema.NullOr(Schema.Number),
  category: Schema.NullOr(Schema.String),
  source: SourceRef,
  affidavit: Affidavit,
});
export type Candidacy = typeof Candidacy.Type;

export const CandidateProfile = Schema.Struct({
  id: CandidateId,
  name: LocalizedName,
  candidacies: Schema.Array(Candidacy),
});
export type CandidateProfile = typeof CandidateProfile.Type;
