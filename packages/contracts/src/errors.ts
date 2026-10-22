import { Schema } from "effect";

export class ElectionNotFound extends Schema.TaggedError<ElectionNotFound>()("ElectionNotFound", {
  electionId: Schema.String,
}) {}

export class ConstituencyNotFound extends Schema.TaggedError<ConstituencyNotFound>()(
  "ConstituencyNotFound",
  { constituencyId: Schema.String },
) {}

export class CandidateNotFound extends Schema.TaggedError<CandidateNotFound>()(
  "CandidateNotFound",
  { candidateId: Schema.String },
) {}

export class DataUnavailable extends Schema.TaggedError<DataUnavailable>()("DataUnavailable", {
  message: Schema.String,
}) {}
