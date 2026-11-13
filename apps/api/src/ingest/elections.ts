/**
 * Tamil Nadu Assembly general elections the importer can load, and the facts
 * shared by every ECI statistical report it reads.
 */

export const USER_AGENT = "TeamRepublicIngest/0.1 (+https://github.com/kaviarasus/team-republic)";

export const PUBLISHER = "Election Commission of India";

export const LICENCE_NOTE =
  "ECI statistical report. No explicit open licence found; reuse status under legal review (product-doc open question 5). See data-sources.md section 1.";

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Tamil Nadu has had 234 assembly constituencies since the 2008 delimitation. */
export const CONSTITUENCY_COUNT = 234;

export const STATE_NAME = "Tamil Nadu";
export const STATE_CODE = "S22";

/**
 * Where ECI lists an election's report files.
 *
 * - `old-site`: `old-site-statistical-report-data?docid=…`, used for reports
 *   carried over from old.eci.gov.in (2021 and earlier). One entry per file,
 *   PDF and XLSX listed separately under `record_realname`.
 * - `report-index`: `election-result?category_id=…`, used by eci.gov.in for
 *   2024 and later. One entry per report with a `title` and an `xlsx_url`.
 */
export type ListingSource =
  | { readonly kind: "old-site"; readonly url: string }
  | { readonly kind: "report-index"; readonly url: string };

/** The listing titles of the four reports the importer reads, exactly as ECI prints them. */
export interface ReportTitles {
  readonly detailed: string;
  readonly winners: string;
  readonly parties: string;
  readonly summary: string;
}

export interface TnAssemblyElection {
  readonly id: string;
  readonly year: number;
  /** The public page a reader can open to find the same files. */
  readonly landingUrl: string;
  readonly listing: ListingSource;
  readonly reports: ReportTitles;
}

export const TN_ASSEMBLY_ELECTIONS: readonly TnAssemblyElection[] = [
  {
    id: "tn-ae-2021",
    year: 2021,
    landingUrl:
      "https://old.eci.gov.in/files/file/13680-tamil-nadu-general-legislative-election-2021/",
    listing: {
      kind: "old-site",
      url: "https://www.eci.gov.in/eci-backend/public/api/old-site-statistical-report-data?docid=13680",
    },
    reports: {
      detailed: "10- Detailed Results",
      winners: "2- List of Successful Candidates",
      parties: "3- List of Political Parties Participated",
      summary: "8- Constituency Data Summary",
    },
  },
  {
    id: "tn-ae-2026",
    year: 2026,
    landingUrl: "https://www.eci.gov.in/statistical-report/ae/2026/26",
    listing: {
      kind: "report-index",
      url: "https://www.eci.gov.in/eci-backend/public/api/election-result?category_id=26",
    },
    reports: {
      detailed: "10-Detailed Results",
      winners: "2-List of Successful Candidates",
      parties: "3-List Of Political Parties Participated",
      // ECI's own spelling.
      summary: "8-Constituency Data Summery Report",
    },
  },
];

/** The configured election with this id, or null. */
export const findTnAssemblyElection = (id: string): TnAssemblyElection | null =>
  TN_ASSEMBLY_ELECTIONS.find((election) => election.id === id) ?? null;
