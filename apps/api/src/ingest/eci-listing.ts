import { ingestFail } from "./errors.ts";
import type { ListingSource } from "./elections.ts";

/** One XLSX report in an ECI listing. */
export interface ListedReport {
  /** The report title as listed, for example "10- Detailed Results". */
  readonly title: string;
  /** The published file name, a single path segment ending in .xlsx. */
  readonly fileName: string;
  readonly downloadUrl: string;
}

export interface ParsedListing {
  /** The election name ECI prints above the report list. */
  readonly electionName: string;
  /** XLSX reports keyed by title. */
  readonly reports: ReadonlyMap<string, ListedReport>;
}

const XLSX_SUFFIX = ".xlsx";

const asRecord = (value: unknown, what: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    ingestFail(`ECI listing: ${what} is not a JSON object`);
  }
  return value as Record<string, unknown>;
};

const nonEmptyString = (value: unknown, what: string): string => {
  if (typeof value !== "string" || value.trim() === "")
    ingestFail(`ECI listing: ${what} is missing`);
  return value.trim();
};

const assertSingleSegment = (fileName: string) => {
  if (
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("..") ||
    fileName.includes("\0")
  ) {
    ingestFail(`ECI listing file name is not a single path segment: ${fileName}`);
  }
};

const isXlsx = (fileName: string): boolean => fileName.toLowerCase().endsWith(XLSX_SUFFIX);

const addReport = (reports: Map<string, ListedReport>, report: ListedReport) => {
  assertSingleSegment(report.fileName);
  if (!isXlsx(report.fileName)) ingestFail(`ECI listing: ${report.fileName} is not an .xlsx file`);
  if (reports.has(report.title)) ingestFail(`ECI listing repeats the report ${report.title}`);
  reports.set(report.title, report);
};

/**
 * `old-site-statistical-report-data`: `title_headline`, then
 * `results.data[0].document_attach[]` with `record_realname` and
 * `record_location`. Each report appears once as PDF and once as XLSX; only
 * the XLSX entries are kept, titled by the file name without ".xlsx".
 */
const parseOldSite = (body: unknown): ParsedListing => {
  const record = asRecord(body, "the response");
  const electionName = nonEmptyString(record.title_headline, "title_headline");
  const results = asRecord(record.results, "results");
  const data = results.data;
  if (!Array.isArray(data) || data.length !== 1) {
    ingestFail("ECI listing: results.data is not a single report");
  }
  const attachments = asRecord(data[0], "the report").document_attach;
  if (!Array.isArray(attachments)) ingestFail("ECI listing: document_attach is missing");

  const reports = new Map<string, ListedReport>();
  const seenNames = new Set<string>();
  for (const attachment of attachments) {
    const entry = asRecord(attachment, "an attachment");
    const fileName = nonEmptyString(entry.record_realname, "record_realname");
    const downloadUrl = nonEmptyString(entry.record_location, "record_location");
    assertSingleSegment(fileName);
    if (seenNames.has(fileName)) ingestFail(`ECI listing repeats ${fileName}`);
    seenNames.add(fileName);
    if (!isXlsx(fileName)) continue;
    addReport(reports, {
      title: fileName.slice(0, -XLSX_SUFFIX.length),
      fileName,
      downloadUrl,
    });
  }
  return { electionName, reports };
};

/**
 * `election-result?category_id=…`: `success`, `title_headline`, then
 * `results[]` with one `title` and one `xlsx_url` per report. The file name is
 * the last segment of `xlsx_url`. A report without an XLSX file is skipped.
 */
const parseReportIndex = (body: unknown): ParsedListing => {
  const record = asRecord(body, "the response");
  if (record.success !== true) ingestFail("ECI listing: success is not true");
  const electionName = nonEmptyString(record.title_headline, "title_headline");
  const results = record.results;
  if (!Array.isArray(results)) ingestFail("ECI listing: results is not a list");

  const reports = new Map<string, ListedReport>();
  for (const result of results) {
    const entry = asRecord(result, "a report");
    const title = nonEmptyString(entry.title, "a report title");
    const rawUrl = entry.xlsx_url;
    if (rawUrl === null || rawUrl === undefined || rawUrl === "") continue;
    const downloadUrl = nonEmptyString(rawUrl, `xlsx_url of ${title}`);
    let url: URL;
    try {
      url = new URL(downloadUrl);
    } catch {
      ingestFail(`ECI listing: xlsx_url of ${title} is not a URL`);
    }
    if (url.protocol !== "https:") ingestFail(`ECI listing: xlsx_url of ${title} is not https`);
    const lastSegment = url.pathname.split("/").at(-1) ?? "";
    let fileName: string;
    try {
      fileName = decodeURIComponent(lastSegment);
    } catch {
      ingestFail(`ECI listing: xlsx_url of ${title} has a malformed file name`);
    }
    if (fileName === "") ingestFail(`ECI listing: xlsx_url of ${title} has no file name`);
    addReport(reports, { title, fileName, downloadUrl });
  }
  return { electionName, reports };
};

/** Reads an ECI listing response. Throws IngestError when the shape is not the expected one. */
export const parseListing = (kind: ListingSource["kind"], body: unknown): ParsedListing =>
  kind === "old-site" ? parseOldSite(body) : parseReportIndex(body);
