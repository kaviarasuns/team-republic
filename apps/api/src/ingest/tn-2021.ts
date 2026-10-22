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
import { assembleTn2021 } from "./assemble-tn2021.ts";
import { IngestError } from "./errors.ts";
import { loadWorkbook } from "./excel.ts";
import { parseConstituencySummaries } from "./parse-constituency-summary.ts";
import { parseDetailedResults } from "./parse-detailed-results.ts";
import { parseParties } from "./parse-parties.ts";
import { parseWinners } from "./parse-winners.ts";
import { storeTn2021, type ArchivedSourceFile } from "./store-tn2021.ts";
import {
  ELECTION_ID,
  FILE_DETAILED,
  FILE_PARTIES,
  FILE_SUMMARY,
  FILE_WINNERS,
  LISTING_URL,
  REQUIRED_FILES,
  USER_AGENT,
} from "./tn2021-constants.ts";

const repoRoot = fileURLToPath(new URL("../../../..", import.meta.url));
const cacheRoot = path.join(repoRoot, ".cache", "sources");
const cacheIndexPath = path.join(cacheRoot, "index.json");

interface ListingFile {
  readonly record_realname: string;
  readonly record_location: string;
}

interface CacheIndex {
  readonly [fileName: string]: { readonly sha256: string; readonly byteSize: number };
}

const sha256Of = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

const storageKeyFor = (sha256: string, fileName: string): string =>
  `eci/${ELECTION_ID}/${sha256}/${fileName}`;

const parseListing = (
  body: unknown,
): { title: string; files: ReadonlyMap<string, ListingFile> } => {
  if (typeof body !== "object" || body === null) {
    throw new IngestError({ message: "ECI listing is not a JSON object" });
  }
  const record = body as Record<string, unknown>;
  const title = record.title_headline;
  if (typeof title !== "string" || title.trim() === "") {
    throw new IngestError({ message: "ECI listing has no title_headline" });
  }
  const results = record.results;
  if (typeof results !== "object" || results === null)
    throw new IngestError({ message: "ECI listing has no results" });
  const data = (results as Record<string, unknown>).data;
  if (!Array.isArray(data) || data.length !== 1) {
    throw new IngestError({ message: "ECI listing results.data is not a single report" });
  }
  const item = data[0];
  if (typeof item !== "object" || item === null)
    throw new IngestError({ message: "ECI listing report is empty" });
  const attachments = (item as Record<string, unknown>).document_attach;
  if (!Array.isArray(attachments))
    throw new IngestError({ message: "ECI listing has no document_attach" });

  const files = new Map<string, ListingFile>();
  for (const attachment of attachments) {
    if (typeof attachment !== "object" || attachment === null) {
      throw new IngestError({ message: "ECI listing attachment is not an object" });
    }
    const name = (attachment as Record<string, unknown>).record_realname;
    const location = (attachment as Record<string, unknown>).record_location;
    if (
      typeof name !== "string" ||
      typeof location !== "string" ||
      name === "" ||
      location === ""
    ) {
      throw new IngestError({
        message: "ECI listing attachment is missing record_realname or record_location",
      });
    }
    if (name.includes("/") || name.includes("\\") || name.includes("..")) {
      throw new IngestError({
        message: `ECI listing file name is not a single path segment: ${name}`,
      });
    }
    if (files.has(name)) throw new IngestError({ message: `ECI listing repeats ${name}` });
    files.set(name, { record_realname: name, record_location: location });
  }
  return { title, files };
};

const readCacheIndex = async (): Promise<CacheIndex> => {
  try {
    const parsed: unknown = JSON.parse(await readFile(cacheIndexPath, "utf8"));
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
  await mkdir(cacheRoot, { recursive: true });
  await writeFile(cacheIndexPath, `${JSON.stringify(next, null, 2)}\n`);
  return next;
};

const downloadFile = (file: ListingFile, index: CacheIndex) =>
  Effect.gen(function* () {
    const cached = yield* Effect.tryPromise({
      try: () => cachedBytes(file.record_realname, index),
      catch: (cause) =>
        new IngestError({
          message: `Cache read failed for ${file.record_realname}: ${String(cause)}`,
        }),
    });
    if (cached !== null) {
      yield* Effect.logInfo("Using cached ECI file", {
        file: file.record_realname,
        bytes: cached.byteLength,
      });
      return { bytes: cached, index };
    }
    yield* Effect.logInfo("Downloading ECI file", { file: file.record_realname });
    const bytes = yield* Effect.tryPromise({
      try: async () => {
        const response = await fetch(file.record_location, {
          headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return new Uint8Array(await response.arrayBuffer());
      },
      catch: (cause) =>
        new IngestError({
          message: `Download failed for ${file.record_realname}: ${cause instanceof Error ? cause.message : String(cause)}`,
        }),
    });
    const next = yield* Effect.tryPromise({
      try: () => writeCache(file.record_realname, bytes, index),
      catch: (cause) =>
        new IngestError({
          message: `Cache write failed for ${file.record_realname}: ${String(cause)}`,
        }),
    });
    return { bytes, index: next };
  });

const archive = (
  fileName: string,
  downloadUrl: string,
  bytes: Uint8Array,
): Effect.Effect<ArchivedSourceFile, IngestError | ObjectStorageError, ObjectStorage> =>
  Effect.gen(function* () {
    const storage = yield* ObjectStorage;
    const sha256 = sha256Of(bytes);
    const storageKey = storageKeyFor(sha256, fileName);
    const exists = yield* storage.exists(storageKey);
    if (!exists) {
      yield* storage.put({
        key: storageKey,
        body: bytes,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        sha256,
      });
      yield* Effect.logInfo("Uploaded source file", { key: storageKey, bytes: bytes.byteLength });
    } else {
      yield* Effect.logInfo("Source file already in object storage", { key: storageKey });
    }
    return { fileName, downloadUrl, sha256, byteSize: bytes.byteLength, storageKey };
  });

const parseSync = <A>(run: () => A) =>
  Effect.try({
    try: run,
    catch: (cause) =>
      cause instanceof IngestError
        ? cause
        : new IngestError({ message: cause instanceof Error ? cause.message : String(cause) }),
  });

export const ingestTn2021 = Effect.gen(function* () {
  const marker = path.join(repoRoot, "pnpm-workspace.yaml");
  const rootReady = yield* Effect.tryPromise({
    try: () => stat(marker),
    catch: () => new IngestError({ message: `Repo root not found at ${repoRoot}` }),
  });
  if (!rootReady.isFile())
    return yield* new IngestError({ message: `Repo root not found at ${repoRoot}` });

  const listingBody = yield* Effect.tryPromise({
    try: async () => {
      const response = await fetch(LISTING_URL, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as unknown;
    },
    catch: (cause) =>
      new IngestError({
        message: `ECI listing request failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      }),
  });
  const listing = yield* parseSync(() => parseListing(listingBody));
  const selected = new Map<string, ListingFile>();
  for (const name of REQUIRED_FILES) {
    const file = listing.files.get(name);
    if (file === undefined)
      return yield* new IngestError({ message: `ECI listing has no ${name}` });
    selected.set(name, file);
  }

  let index = yield* Effect.tryPromise({
    try: () => readCacheIndex(),
    catch: (cause) =>
      new IngestError({ message: `Could not read the download cache: ${String(cause)}` }),
  });
  const downloaded = new Map<string, Uint8Array>();
  for (const name of REQUIRED_FILES) {
    const file = selected.get(name);
    if (file === undefined)
      return yield* new IngestError({ message: `missing selected file ${name}` });
    const result = yield* downloadFile(file, index);
    index = result.index;
    downloaded.set(name, result.bytes);
  }

  const detailedBytes = downloaded.get(FILE_DETAILED);
  const partiesBytes = downloaded.get(FILE_PARTIES);
  const winnersBytes = downloaded.get(FILE_WINNERS);
  const summaryBytes = downloaded.get(FILE_SUMMARY);
  if (
    detailedBytes === undefined ||
    partiesBytes === undefined ||
    winnersBytes === undefined ||
    summaryBytes === undefined
  ) {
    return yield* new IngestError({ message: "a required workbook was not downloaded" });
  }

  const detailedBook = yield* loadWorkbook(detailedBytes, FILE_DETAILED);
  const partiesBook = yield* loadWorkbook(partiesBytes, FILE_PARTIES);
  const winnersBook = yield* loadWorkbook(winnersBytes, FILE_WINNERS);
  const summaryBook = yield* loadWorkbook(summaryBytes, FILE_SUMMARY);
  const assembled = yield* parseSync(() =>
    assembleTn2021({
      detailed: parseDetailedResults(detailedBook),
      parties: parseParties(partiesBook),
      winners: parseWinners(winnersBook),
      summaries: parseConstituencySummaries(summaryBook),
    }),
  );
  yield* Effect.logInfo("TN 2021 workbooks validated", {
    constituencies: assembled.constituencies.length,
    candidates: assembled.constituencies.reduce(
      (sum, constituency) => sum + constituency.candidates.length,
      0,
    ),
    parties: assembled.parties.length,
  });

  const detailedFile = selected.get(FILE_DETAILED);
  const partiesFile = selected.get(FILE_PARTIES);
  const winnersFile = selected.get(FILE_WINNERS);
  const summaryFile = selected.get(FILE_SUMMARY);
  if (
    detailedFile === undefined ||
    partiesFile === undefined ||
    winnersFile === undefined ||
    summaryFile === undefined
  ) {
    return yield* new IngestError({ message: "a required listing entry disappeared" });
  }

  const summary = yield* storeTn2021(
    {
      detailed: yield* archive(FILE_DETAILED, detailedFile.record_location, detailedBytes),
      parties: yield* archive(FILE_PARTIES, partiesFile.record_location, partiesBytes),
      winners: yield* archive(FILE_WINNERS, winnersFile.record_location, winnersBytes),
      summary: yield* archive(FILE_SUMMARY, summaryFile.record_location, summaryBytes),
    },
    listing.title,
    assembled,
  );
  yield* Effect.logInfo("TN 2021 results stored", summary);
  return summary;
});

if (import.meta.main) {
  ingestTn2021.pipe(
    Effect.provide(Layer.mergeAll(DatabaseLive, ObjectStorageLive)),
    NodeRuntime.runMain,
  );
}
