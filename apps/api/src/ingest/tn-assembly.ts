import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { DatabaseLive } from "../db/database.ts";
import {
  ObjectStorage,
  ObjectStorageLive,
  type ObjectStorageError,
} from "../storage/object-storage.ts";
import { assembleResults } from "./assemble.ts";
import { parseListing, type ListedReport } from "./eci-listing.ts";
import {
  findTnAssemblyElection,
  TN_ASSEMBLY_ELECTIONS,
  USER_AGENT,
  XLSX_MIME,
  type ReportTitles,
  type TnAssemblyElection,
} from "./elections.ts";
import { IngestError } from "./errors.ts";
import { loadWorkbook } from "./excel.ts";
import { parseConstituencySummaries } from "./parse-constituency-summary.ts";
import { parseDetailedResults } from "./parse-detailed-results.ts";
import { parseParties } from "./parse-parties.ts";
import { parseWinners } from "./parse-winners.ts";
import { storeElection, type ArchivedSourceFile } from "./store.ts";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const cacheRoot = path.join(repoRoot, ".cache", "sources");

/** Per-election download index, so two elections may publish files with the same name. */
const cacheIndexPath = (electionId: string) => path.join(cacheRoot, `${electionId}.index.json`);

interface CacheIndex {
  readonly [fileName: string]: { readonly sha256: string; readonly byteSize: number };
}

type ReportKey = keyof ReportTitles;
const REPORT_KEYS: readonly ReportKey[] = ["detailed", "parties", "winners", "summary"];

const sha256Of = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const storageKeyFor = (electionId: string, sha256: string, fileName: string): string =>
  `eci/${electionId}/${sha256}/${fileName}`;

const errorText = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const readCacheIndex = async (electionId: string): Promise<CacheIndex> => {
  try {
    const parsed: unknown = JSON.parse(await readFile(cacheIndexPath(electionId), "utf8"));
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as CacheIndex;
  } catch {
    return {};
  }
};

const cachedBytes = async (fileName: string, index: CacheIndex): Promise<Uint8Array | null> => {
  const entry = index[fileName];
  if (entry === undefined || typeof entry.sha256 !== "string") return null;
  const filePath = path.join(cacheRoot, entry.sha256, fileName);
  try {
    const bytes = new Uint8Array(await readFile(filePath));
    if (sha256Of(bytes) === entry.sha256 && bytes.byteLength === entry.byteSize) return bytes;
  } catch {
    return null;
  }
  return null;
};

const writeCache = async (
  electionId: string,
  fileName: string,
  bytes: Uint8Array,
  index: CacheIndex,
): Promise<CacheIndex> => {
  const sha256 = sha256Of(bytes);
  const dest = path.join(cacheRoot, sha256, fileName);
  await mkdir(path.dirname(dest), { recursive: true });
  const partial = `${dest}.partial`;
  await writeFile(partial, bytes);
  await rename(partial, dest);
  const next: CacheIndex = { ...index, [fileName]: { sha256, byteSize: bytes.byteLength } };
  await writeFile(cacheIndexPath(electionId), `${JSON.stringify(next, null, 2)}\n`);
  return next;
};

const fetchJson = (url: string) =>
  Effect.tryPromise({
    try: async () => {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as unknown;
    },
    catch: (cause) =>
      new IngestError({ message: `ECI listing request failed: ${errorText(cause)}` }),
  });

const downloadFile = (electionId: string, report: ListedReport, index: CacheIndex) =>
  Effect.gen(function* () {
    const cached = yield* Effect.tryPromise({
      try: () => cachedBytes(report.fileName, index),
      catch: (cause) =>
        new IngestError({ message: `Cache read failed for ${report.fileName}: ${String(cause)}` }),
    });
    if (cached !== null) {
      yield* Effect.logInfo("Using cached ECI file", {
        file: report.fileName,
        bytes: cached.byteLength,
      });
      return { bytes: cached, index };
    }
    yield* Effect.logInfo("Downloading ECI file", { file: report.fileName });
    const bytes = yield* Effect.tryPromise({
      try: async () => {
        const response = await fetch(report.downloadUrl, {
          headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return new Uint8Array(await response.arrayBuffer());
      },
      catch: (cause) =>
        new IngestError({
          message: `Download failed for ${report.fileName}: ${errorText(cause)}`,
        }),
    });
    const next = yield* Effect.tryPromise({
      try: async () => {
        await mkdir(cacheRoot, { recursive: true });
        return writeCache(electionId, report.fileName, bytes, index);
      },
      catch: (cause) =>
        new IngestError({ message: `Cache write failed for ${report.fileName}: ${String(cause)}` }),
    });
    return { bytes, index: next };
  });

const archive = (
  electionId: string,
  report: ListedReport,
  bytes: Uint8Array,
): Effect.Effect<ArchivedSourceFile, IngestError | ObjectStorageError, ObjectStorage> =>
  Effect.gen(function* () {
    const storage = yield* ObjectStorage;
    const sha256 = sha256Of(bytes);
    const storageKey = storageKeyFor(electionId, sha256, report.fileName);
    const exists = yield* storage.exists(storageKey);
    if (!exists) {
      yield* storage.put({ key: storageKey, body: bytes, contentType: XLSX_MIME, sha256 });
      yield* Effect.logInfo("Uploaded source file", { key: storageKey, bytes: bytes.byteLength });
    } else {
      yield* Effect.logInfo("Source file already in object storage", { key: storageKey });
    }
    return {
      title: report.title,
      fileName: report.fileName,
      downloadUrl: report.downloadUrl,
      sha256,
      byteSize: bytes.byteLength,
      storageKey,
    };
  });

const parseSync = <A>(run: () => A) =>
  Effect.try({
    try: run,
    catch: (cause) =>
      cause instanceof IngestError ? cause : new IngestError({ message: errorText(cause) }),
  });

const assertRepoRoot = Effect.gen(function* () {
  const marker = path.join(repoRoot, "pnpm-workspace.yaml");
  const rootReady = yield* Effect.tryPromise({
    try: () => stat(marker),
    catch: () => new IngestError({ message: `Repo root not found at ${repoRoot}` }),
  });
  if (!rootReady.isFile())
    return yield* new IngestError({ message: `Repo root not found at ${repoRoot}` });
});

/**
 * Downloads one election's four ECI reports (or reuses the local cache),
 * validates them against each other, archives them in object storage, and
 * replaces that election's rows in the database.
 */
export const ingestTnAssemblyElection = (election: TnAssemblyElection) =>
  Effect.gen(function* () {
    yield* assertRepoRoot;
    const listingBody = yield* fetchJson(election.listing.url);
    const listing = yield* parseSync(() => parseListing(election.listing.kind, listingBody));

    const selected = {} as Record<ReportKey, ListedReport>;
    for (const key of REPORT_KEYS) {
      const title = election.reports[key];
      const report = listing.reports.get(title);
      if (report === undefined) {
        return yield* new IngestError({
          message: `${election.id}: ECI listing has no XLSX report titled ${JSON.stringify(title)} (found: ${[...listing.reports.keys()].join(", ")})`,
        });
      }
      selected[key] = report;
    }

    let index = yield* Effect.tryPromise({
      try: () => readCacheIndex(election.id),
      catch: (cause) =>
        new IngestError({ message: `Could not read the download cache: ${String(cause)}` }),
    });
    const downloaded = {} as Record<ReportKey, Uint8Array>;
    for (const key of REPORT_KEYS) {
      const result = yield* downloadFile(election.id, selected[key], index);
      index = result.index;
      downloaded[key] = result.bytes;
    }

    const detailedBook = yield* loadWorkbook(downloaded.detailed, selected.detailed.fileName);
    const partiesBook = yield* loadWorkbook(downloaded.parties, selected.parties.fileName);
    const winnersBook = yield* loadWorkbook(downloaded.winners, selected.winners.fileName);
    const summaryBook = yield* loadWorkbook(downloaded.summary, selected.summary.fileName);
    const assembled = yield* parseSync(() =>
      assembleResults({
        detailed: parseDetailedResults(detailedBook),
        parties: parseParties(partiesBook),
        winners: parseWinners(winnersBook),
        summaries: parseConstituencySummaries(summaryBook),
      }),
    );
    yield* Effect.logInfo("Workbooks validated", {
      electionId: election.id,
      constituencies: assembled.constituencies.length,
      candidates: assembled.constituencies.reduce(
        (sum, constituency) => sum + constituency.candidates.length,
        0,
      ),
      parties: assembled.parties.length,
    });

    const summary = yield* storeElection(
      election,
      {
        detailed: yield* archive(election.id, selected.detailed, downloaded.detailed),
        parties: yield* archive(election.id, selected.parties, downloaded.parties),
        winners: yield* archive(election.id, selected.winners, downloaded.winners),
        summary: yield* archive(election.id, selected.summary, downloaded.summary),
      },
      listing.electionName,
      assembled,
    );
    yield* Effect.logInfo("Results stored", summary);
    return summary;
  });

/**
 * Ingests the elections named by id, in the order given. With no ids, ingests
 * every configured election from oldest to newest, so the newest one ends up
 * as the latest general election.
 */
export const ingestTnAssembly = (electionIds: readonly string[]) =>
  Effect.gen(function* () {
    const elections: TnAssemblyElection[] = [];
    if (electionIds.length === 0) {
      elections.push(...[...TN_ASSEMBLY_ELECTIONS].sort((left, right) => left.year - right.year));
    } else {
      for (const id of electionIds) {
        const election = findTnAssemblyElection(id);
        if (election === null) {
          return yield* new IngestError({
            message: `Unknown election ${JSON.stringify(id)}. Known: ${TN_ASSEMBLY_ELECTIONS.map((known) => known.id).join(", ")}`,
          });
        }
        elections.push(election);
      }
    }
    return yield* Effect.forEach(elections, ingestTnAssemblyElection);
  });

if (import.meta.main) {
  ingestTnAssembly(process.argv.slice(2)).pipe(
    Effect.provide(Layer.mergeAll(DatabaseLive, ObjectStorageLive)),
    NodeRuntime.runMain,
  );
}
