CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affidavit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"candidacy_id" uuid NOT NULL CONSTRAINT "affidavit_candidacy_unique" UNIQUE,
	"source_document_id" uuid NOT NULL,
	"assets_rupees" bigint,
	"assets_page" integer,
	"liabilities_rupees" bigint,
	"liabilities_page" integer,
	"education" text,
	"education_page" integer,
	"review_status" text DEFAULT 'unreviewed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affidavit_criminal_case" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"affidavit_id" uuid NOT NULL,
	"description" text NOT NULL,
	"status" text NOT NULL,
	"page" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidacy" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"election_id" text NOT NULL,
	"constituency_id" uuid NOT NULL,
	"candidate_id" uuid NOT NULL,
	"party_id" uuid,
	"status" text NOT NULL,
	"sex" text,
	"age" integer,
	"category" text,
	"general_votes" integer,
	"postal_votes" integer,
	"total_votes" integer,
	"rank" integer,
	"is_winner" boolean DEFAULT false NOT NULL,
	"source_document_id" uuid NOT NULL,
	"source_sheet" text,
	"source_row" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidacy_result_has_votes" CHECK ("status" <> 'result' or "total_votes" is not null)
);
--> statement-breakpoint
CREATE TABLE "candidate" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name_en" text,
	"name_ta" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "constituency" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"election_id" text NOT NULL,
	"delimitation_id" text,
	"number" integer NOT NULL,
	"name_en" text,
	"name_ta" text,
	"reservation" text,
	"district_en" text,
	"district_ta" text,
	"electors" integer,
	"nota_votes" integer,
	"source_document_id" uuid NOT NULL,
	"source_sheet" text,
	"source_row" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "constituency_election_number_unique" UNIQUE("election_id","number")
);
--> statement-breakpoint
CREATE TABLE "constituency_lineage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"predecessor_id" uuid NOT NULL,
	"successor_id" uuid NOT NULL,
	"relation" text NOT NULL,
	"source_document_id" uuid NOT NULL,
	"source_page" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "constituency_lineage_pair_unique" UNIQUE("predecessor_id","successor_id")
);
--> statement-breakpoint
CREATE TABLE "delimitation" (
	"id" text PRIMARY KEY,
	"name_en" text,
	"name_ta" text,
	"effective_from_year" integer,
	"source_document_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "election" (
	"id" text PRIMARY KEY,
	"kind" text NOT NULL,
	"state_code" text NOT NULL,
	"year" integer NOT NULL,
	"name_en" text,
	"name_ta" text,
	"source_document_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" bigserial PRIMARY KEY,
	"topic" text NOT NULL,
	"payload" jsonb NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"abbreviation" text NOT NULL CONSTRAINT "party_abbreviation_unique" UNIQUE,
	"name_en" text,
	"name_ta" text,
	"source_document_id" uuid NOT NULL,
	"source_sheet" text,
	"source_row" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL UNIQUE,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"publisher" text NOT NULL,
	"title" text NOT NULL,
	"landing_url" text NOT NULL,
	"download_url" text NOT NULL,
	"file_name" text NOT NULL,
	"media_type" text NOT NULL,
	"sha256" text NOT NULL CONSTRAINT "source_document_sha256_unique" UNIQUE,
	"byte_size" integer NOT NULL,
	"storage_key" text NOT NULL,
	"licence_note" text NOT NULL,
	"retrieved_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "candidacy_constituency_idx" ON "candidacy" ("constituency_id");--> statement-breakpoint
CREATE INDEX "candidacy_candidate_idx" ON "candidacy" ("candidate_id");--> statement-breakpoint
CREATE INDEX "election_state_year_idx" ON "election" ("state_code","year");--> statement-breakpoint
CREATE INDEX "outbox_pending_idx" ON "outbox" ("available_at") WHERE "processed_at" is null;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "affidavit" ADD CONSTRAINT "affidavit_candidacy_id_candidacy_id_fkey" FOREIGN KEY ("candidacy_id") REFERENCES "candidacy"("id");--> statement-breakpoint
ALTER TABLE "affidavit" ADD CONSTRAINT "affidavit_source_document_id_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_document"("id");--> statement-breakpoint
ALTER TABLE "affidavit_criminal_case" ADD CONSTRAINT "affidavit_criminal_case_affidavit_id_affidavit_id_fkey" FOREIGN KEY ("affidavit_id") REFERENCES "affidavit"("id");--> statement-breakpoint
ALTER TABLE "candidacy" ADD CONSTRAINT "candidacy_election_id_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "election"("id");--> statement-breakpoint
ALTER TABLE "candidacy" ADD CONSTRAINT "candidacy_constituency_id_constituency_id_fkey" FOREIGN KEY ("constituency_id") REFERENCES "constituency"("id");--> statement-breakpoint
ALTER TABLE "candidacy" ADD CONSTRAINT "candidacy_candidate_id_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("id");--> statement-breakpoint
ALTER TABLE "candidacy" ADD CONSTRAINT "candidacy_party_id_party_id_fkey" FOREIGN KEY ("party_id") REFERENCES "party"("id");--> statement-breakpoint
ALTER TABLE "candidacy" ADD CONSTRAINT "candidacy_source_document_id_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_document"("id");--> statement-breakpoint
ALTER TABLE "constituency" ADD CONSTRAINT "constituency_election_id_election_id_fkey" FOREIGN KEY ("election_id") REFERENCES "election"("id");--> statement-breakpoint
ALTER TABLE "constituency" ADD CONSTRAINT "constituency_delimitation_id_delimitation_id_fkey" FOREIGN KEY ("delimitation_id") REFERENCES "delimitation"("id");--> statement-breakpoint
ALTER TABLE "constituency" ADD CONSTRAINT "constituency_source_document_id_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_document"("id");--> statement-breakpoint
ALTER TABLE "constituency_lineage" ADD CONSTRAINT "constituency_lineage_predecessor_id_constituency_id_fkey" FOREIGN KEY ("predecessor_id") REFERENCES "constituency"("id");--> statement-breakpoint
ALTER TABLE "constituency_lineage" ADD CONSTRAINT "constituency_lineage_successor_id_constituency_id_fkey" FOREIGN KEY ("successor_id") REFERENCES "constituency"("id");--> statement-breakpoint
ALTER TABLE "constituency_lineage" ADD CONSTRAINT "constituency_lineage_source_document_id_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_document"("id");--> statement-breakpoint
ALTER TABLE "delimitation" ADD CONSTRAINT "delimitation_source_document_id_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_document"("id");--> statement-breakpoint
ALTER TABLE "election" ADD CONSTRAINT "election_source_document_id_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_document"("id");--> statement-breakpoint
ALTER TABLE "party" ADD CONSTRAINT "party_source_document_id_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "source_document"("id");--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;