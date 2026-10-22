import { Data } from "effect";

/** A source file was ambiguous, or a figure failed a check. Nothing is written. */
export class IngestError extends Data.TaggedError("IngestError")<{
  readonly message: string;
}> {}

export function ingestFail(message: string): never {
  throw new IngestError({ message });
}
