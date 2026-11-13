import { eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import { Database } from "../db/database.ts";
import * as t from "../db/schema.ts";
import { enqueue } from "../outbox/outbox.ts";
import type { AssembledElection } from "./assemble.ts";
import {
  LICENCE_NOTE,
  PUBLISHER,
  STATE_CODE,
  XLSX_MIME,
  type TnAssemblyElection,
} from "./elections.ts";
import { IngestError } from "./errors.ts";

export interface ArchivedSourceFile {
  /** The report title as ECI lists it. */
  readonly title: string;
  readonly fileName: string;
  readonly downloadUrl: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly storageKey: string;
}

export interface IngestSummary {
  readonly electionId: string;
  readonly constituencies: number;
  readonly candidates: number;
  readonly parties: number;
  readonly sourceDocuments: number;
}

const sourceRow = (
  file: ArchivedSourceFile,
  landingUrl: string,
  retrievedAt: Date,
): typeof t.sourceDocument.$inferInsert => ({
  publisher: PUBLISHER,
  title: file.title,
  landingUrl,
  downloadUrl: file.downloadUrl,
  fileName: file.fileName,
  mediaType: XLSX_MIME,
  sha256: file.sha256,
  byteSize: file.byteSize,
  storageKey: file.storageKey,
  licenceNote: LICENCE_NOTE,
  retrievedAt,
});

/**
 * Replaces one election in one transaction: delete its candidacies, the
 * candidate rows only those candidacies referenced, and its constituencies;
 * upsert the election; insert parties not stored yet; insert the new rows;
 * enqueue `results.stored`. A failure rolls the transaction back, including
 * the outbox insert.
 *
 * Parties are shared across elections and keyed by abbreviation. An existing
 * party keeps the name and source it was first stored with: the 2026 list
 * prints names in a different case ("Communist Party Of India (marxist)"), and
 * overwriting would change how earlier elections show the same party.
 */
export const storeElection = (
  election: TnAssemblyElection,
  files: {
    readonly detailed: ArchivedSourceFile;
    readonly parties: ArchivedSourceFile;
    readonly winners: ArchivedSourceFile;
    readonly summary: ArchivedSourceFile;
  },
  electionName: string,
  assembled: AssembledElection,
) =>
  Effect.gen(function* () {
    const db = yield* Database;
    const retrievedAt = new Date();
    return yield* db.transaction((tx) =>
      Effect.gen(function* () {
        const documentIds = new Map<string, string>();
        for (const file of [files.detailed, files.parties, files.winners, files.summary]) {
          const [row] = yield* tx
            .insert(t.sourceDocument)
            .values(sourceRow(file, election.landingUrl, retrievedAt))
            .onConflictDoUpdate({
              target: t.sourceDocument.sha256,
              set: {
                publisher: PUBLISHER,
                title: file.title,
                landingUrl: election.landingUrl,
                downloadUrl: file.downloadUrl,
                fileName: file.fileName,
                mediaType: XLSX_MIME,
                byteSize: file.byteSize,
                storageKey: file.storageKey,
                licenceNote: LICENCE_NOTE,
                retrievedAt,
              },
            })
            .returning({ id: t.sourceDocument.id, sha256: t.sourceDocument.sha256 });
          if (row === undefined) {
            return yield* new IngestError({
              message: `source document upsert returned no row for ${file.fileName}`,
            });
          }
          documentIds.set(row.sha256, row.id);
        }

        const detailedId = documentIds.get(files.detailed.sha256);
        const partiesId = documentIds.get(files.parties.sha256);
        if (detailedId === undefined || partiesId === undefined) {
          return yield* new IngestError({
            message:
              "source document ids for Detailed Results or the parties list were not returned",
          });
        }

        const previous = yield* tx
          .select({ candidateId: t.candidacy.candidateId })
          .from(t.candidacy)
          .where(eq(t.candidacy.electionId, election.id));
        const previousCandidateIds = [...new Set(previous.map((row) => row.candidateId))];

        yield* tx.delete(t.candidacy).where(eq(t.candidacy.electionId, election.id));
        if (previousCandidateIds.length > 0) {
          const stillUsed = yield* tx
            .select({ candidateId: t.candidacy.candidateId })
            .from(t.candidacy)
            .where(inArray(t.candidacy.candidateId, previousCandidateIds));
          const used = new Set(stillUsed.map((row) => row.candidateId));
          const orphanIds = previousCandidateIds.filter((id) => !used.has(id));
          if (orphanIds.length > 0) {
            yield* tx.delete(t.candidate).where(inArray(t.candidate.id, orphanIds));
          }
        }
        yield* tx.delete(t.constituency).where(eq(t.constituency.electionId, election.id));

        yield* tx
          .insert(t.election)
          .values({
            id: election.id,
            kind: "general",
            stateCode: STATE_CODE,
            year: election.year,
            nameEn: electionName,
            nameTa: null,
            sourceDocumentId: detailedId,
          })
          .onConflictDoUpdate({
            target: t.election.id,
            set: {
              kind: "general",
              stateCode: STATE_CODE,
              year: election.year,
              nameEn: electionName,
              nameTa: null,
              sourceDocumentId: detailedId,
            },
          });

        const partyIds = new Map<string, string>();
        for (const party of assembled.parties) {
          const [row] = yield* tx
            .insert(t.party)
            .values({
              abbreviation: party.abbreviation,
              nameEn: party.nameEn,
              nameTa: null,
              sourceDocumentId: partiesId,
              sourceSheet: party.sourceSheet,
              sourceRow: party.sourceRow,
            })
            .onConflictDoUpdate({
              target: t.party.abbreviation,
              // Keep the stored row; the no-op update makes RETURNING give its id.
              set: { abbreviation: party.abbreviation },
            })
            .returning({ id: t.party.id, abbreviation: t.party.abbreviation });
          if (row === undefined) {
            return yield* new IngestError({
              message: `party upsert returned no row for ${party.abbreviation}`,
            });
          }
          partyIds.set(row.abbreviation, row.id);
        }

        const insertedConstituencies = yield* tx
          .insert(t.constituency)
          .values(
            assembled.constituencies.map((constituency) => ({
              electionId: election.id,
              number: constituency.number,
              nameEn: constituency.nameEn,
              nameTa: null,
              reservation: constituency.reservation,
              districtEn: constituency.districtEn,
              districtTa: null,
              electors: constituency.electors,
              notaVotes: constituency.notaVotes,
              sourceDocumentId: detailedId,
              sourceSheet: constituency.sourceSheet,
              sourceRow: constituency.sourceRow,
            })),
          )
          .returning({ id: t.constituency.id, number: t.constituency.number });
        const constituencyIds = new Map(insertedConstituencies.map((row) => [row.number, row.id]));

        let candidates = 0;
        for (const constituency of assembled.constituencies) {
          const constituencyId = constituencyIds.get(constituency.number);
          if (constituencyId === undefined) {
            return yield* new IngestError({
              message: `constituency ${constituency.number} insert returned no id`,
            });
          }
          // PostgreSQL returns INSERT … RETURNING rows in insertion order when
          // no trigger rewrites the statement. The length check rejects a short
          // result; the spot-check against the workbook catches a reorder.
          const people = yield* tx
            .insert(t.candidate)
            .values(
              constituency.candidates.map((candidate) => ({
                nameEn: candidate.nameEn,
                nameTa: null,
              })),
            )
            .returning({ id: t.candidate.id });
          if (people.length !== constituency.candidates.length) {
            return yield* new IngestError({
              message: `AC ${constituency.number}: inserted ${people.length} candidates, expected ${constituency.candidates.length}`,
            });
          }
          const candidacyRows: (typeof t.candidacy.$inferInsert)[] = [];
          for (const [index, candidate] of constituency.candidates.entries()) {
            const person = people[index];
            if (person === undefined) {
              return yield* new IngestError({
                message: `AC ${constituency.number}: missing candidate id at index ${index}`,
              });
            }
            let partyId: string | null = null;
            if (candidate.partyAbbreviation !== null) {
              const found = partyIds.get(candidate.partyAbbreviation);
              if (found === undefined) {
                return yield* new IngestError({
                  message: `AC ${constituency.number}: no party id for ${candidate.partyAbbreviation}`,
                });
              }
              partyId = found;
            }
            candidacyRows.push({
              electionId: election.id,
              constituencyId,
              candidateId: person.id,
              partyId,
              status: "result",
              sex: candidate.sex,
              age: candidate.age,
              category: candidate.category,
              generalVotes: candidate.generalVotes,
              postalVotes: candidate.postalVotes,
              totalVotes: candidate.totalVotes,
              rank: candidate.rank,
              isWinner: candidate.isWinner,
              sourceDocumentId: detailedId,
              sourceSheet: candidate.sourceSheet,
              sourceRow: candidate.sourceRow,
            });
          }
          yield* tx.insert(t.candidacy).values(candidacyRows);
          candidates += candidacyRows.length;
        }

        yield* enqueue("results.stored", { electionId: election.id });

        const summary: IngestSummary = {
          electionId: election.id,
          constituencies: assembled.constituencies.length,
          candidates,
          parties: assembled.parties.length,
          sourceDocuments: documentIds.size,
        };
        return summary;
      }),
    );
  });
