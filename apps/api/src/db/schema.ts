import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

/**
 * One file exactly as we fetched it. Every stored figure points at a row here,
 * plus the sheet/row or page inside the file where the figure is printed.
 */
export const sourceDocument = pgTable(
  "source_document",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publisher: text("publisher").notNull(),
    title: text("title").notNull(),
    /** Public page a reader can open to find this file. */
    landingUrl: text("landing_url").notNull(),
    /** Direct URL the bytes were downloaded from. */
    downloadUrl: text("download_url").notNull(),
    fileName: text("file_name").notNull(),
    mediaType: text("media_type").notNull(),
    sha256: text("sha256").notNull(),
    byteSize: integer("byte_size").notNull(),
    /** Key of the archived copy in object storage. */
    storageKey: text("storage_key").notNull(),
    licenceNote: text("licence_note").notNull(),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [unique("source_document_sha256_unique").on(t.sha256)],
);

export const election = pgTable(
  "election",
  {
    /** Stable slug, e.g. `tn-ae-2021`. */
    id: text("id").primaryKey(),
    kind: text("kind", { enum: ["general", "bye"] }).notNull(),
    stateCode: text("state_code").notNull(),
    year: integer("year").notNull(),
    nameEn: text("name_en"),
    nameTa: text("name_ta"),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => sourceDocument.id),
    createdAt: createdAt(),
  },
  (t) => [index("election_state_year_idx").on(t.stateCode, t.year)],
);

/** A delimitation order. Empty until we hold the order document itself. */
export const delimitation = pgTable("delimitation", {
  id: text("id").primaryKey(),
  nameEn: text("name_en"),
  nameTa: text("name_ta"),
  effectiveFromYear: integer("effective_from_year"),
  sourceDocumentId: uuid("source_document_id")
    .notNull()
    .references(() => sourceDocument.id),
  createdAt: createdAt(),
});

/**
 * A constituency as printed in one election's report. The same seat in two
 * elections is two rows; v1 never joins them.
 */
export const constituency = pgTable(
  "constituency",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    electionId: text("election_id")
      .notNull()
      .references(() => election.id),
    delimitationId: text("delimitation_id").references(() => delimitation.id),
    number: integer("number").notNull(),
    nameEn: text("name_en"),
    nameTa: text("name_ta"),
    reservation: text("reservation", { enum: ["GEN", "SC", "ST"] }),
    districtEn: text("district_en"),
    districtTa: text("district_ta"),
    electors: integer("electors"),
    /** Votes for None of the Above, as printed. */
    notaVotes: integer("nota_votes"),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => sourceDocument.id),
    sourceSheet: text("source_sheet"),
    sourceRow: integer("source_row"),
    createdAt: createdAt(),
  },
  (t) => [unique("constituency_election_number_unique").on(t.electionId, t.number)],
);

/**
 * Predecessor/successor links across delimitations. Never populated in v1:
 * there is no commercial-safe lineage source yet, and links must not be guessed.
 */
export const constituencyLineage = pgTable(
  "constituency_lineage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    predecessorId: uuid("predecessor_id")
      .notNull()
      .references(() => constituency.id),
    successorId: uuid("successor_id")
      .notNull()
      .references(() => constituency.id),
    relation: text("relation", { enum: ["continued", "renamed", "split", "merged"] }).notNull(),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => sourceDocument.id),
    sourcePage: integer("source_page"),
    createdAt: createdAt(),
  },
  (t) => [unique("constituency_lineage_pair_unique").on(t.predecessorId, t.successorId)],
);

export const party = pgTable(
  "party",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    abbreviation: text("abbreviation").notNull(),
    nameEn: text("name_en"),
    nameTa: text("name_ta"),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => sourceDocument.id),
    sourceSheet: text("source_sheet"),
    sourceRow: integer("source_row"),
    createdAt: createdAt(),
  },
  (t) => [unique("party_abbreviation_unique").on(t.abbreviation)],
);

/** A person as named in one source row. No cross-election identity resolution in v1. */
export const candidate = pgTable("candidate", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameEn: text("name_en"),
  nameTa: text("name_ta"),
  createdAt: createdAt(),
});

/** One candidate standing in one constituency in one election, with the result. */
export const candidacy = pgTable(
  "candidacy",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    electionId: text("election_id")
      .notNull()
      .references(() => election.id),
    constituencyId: uuid("constituency_id")
      .notNull()
      .references(() => constituency.id),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidate.id),
    /** Null for an independent candidate. */
    partyId: uuid("party_id").references(() => party.id),
    status: text("status", { enum: ["contesting", "result"] }).notNull(),
    sex: text("sex"),
    age: integer("age"),
    category: text("category"),
    generalVotes: integer("general_votes"),
    postalVotes: integer("postal_votes"),
    totalVotes: integer("total_votes"),
    rank: integer("rank"),
    isWinner: boolean("is_winner").notNull().default(false),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => sourceDocument.id),
    sourceSheet: text("source_sheet"),
    sourceRow: integer("source_row"),
    createdAt: createdAt(),
  },
  (t) => [
    index("candidacy_constituency_idx").on(t.constituencyId),
    index("candidacy_candidate_idx").on(t.candidateId),
    check(
      "candidacy_result_has_votes",
      sql`${t.status} <> 'result' or ${t.totalVotes} is not null`,
    ),
  ],
);

/** Figures parsed from one Form 26 affidavit PDF. Each figure keeps its page number. */
export const affidavit = pgTable(
  "affidavit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidacyId: uuid("candidacy_id")
      .notNull()
      .references(() => candidacy.id),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => sourceDocument.id),
    assetsRupees: bigint("assets_rupees", { mode: "number" }),
    assetsPage: integer("assets_page"),
    liabilitiesRupees: bigint("liabilities_rupees", { mode: "number" }),
    liabilitiesPage: integer("liabilities_page"),
    education: text("education"),
    educationPage: integer("education_page"),
    reviewStatus: text("review_status", { enum: ["unreviewed", "verified"] })
      .notNull()
      .default("unreviewed"),
    createdAt: createdAt(),
  },
  (t) => [unique("affidavit_candidacy_unique").on(t.candidacyId)],
);

export const affidavitCriminalCase = pgTable("affidavit_criminal_case", {
  id: uuid("id").primaryKey().defaultRandom(),
  affidavitId: uuid("affidavit_id")
    .notNull()
    .references(() => affidavit.id),
  description: text("description").notNull(),
  status: text("status", { enum: ["pending", "convicted"] }).notNull(),
  page: integer("page").notNull(),
  createdAt: createdAt(),
});

/** Transactional outbox. Workers claim rows with `FOR UPDATE SKIP LOCKED`. */
export const outbox = pgTable(
  "outbox",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    topic: text("topic").notNull(),
    payload: jsonb("payload").notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("outbox_pending_idx")
      .on(t.availableAt)
      .where(sql`${t.processedAt} is null`),
  ],
);

// Better Auth core tables (user, session, account, verification).
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
