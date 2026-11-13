import { describe, expect, it } from "@effect/vitest";
import { parseListing } from "../../src/ingest/eci-listing.ts";

// Synthetic fixture. The shapes mirror the two ECI listing APIs; the values are made up.

const oldSiteBody = (attachments: readonly { name: string; url: string }[]) => ({
  title_headline: "Test General Election 2001",
  results: {
    data: [
      {
        document_attach: attachments.map(({ name, url }) => ({
          record_realname: name,
          record_location: url,
        })),
      },
    ],
  },
});

const reportIndexBody = (results: readonly Record<string, unknown>[]) => ({
  success: true,
  title_headline: "Test General Election 2031",
  results,
});

describe("parseListing", () => {
  it("keeps only the XLSX files of an old-site listing and titles them by file name", () => {
    const listing = parseListing(
      "old-site",
      oldSiteBody([
        { name: "10- Detailed Results.pdf", url: "https://example.test/a" },
        { name: "10- Detailed Results.xlsx", url: "https://example.test/b" },
      ]),
    );
    expect(listing.electionName).toBe("Test General Election 2001");
    expect([...listing.reports.values()]).toEqual([
      {
        title: "10- Detailed Results",
        fileName: "10- Detailed Results.xlsx",
        downloadUrl: "https://example.test/b",
      },
    ]);
  });

  it("rejects an old-site file name that is not a single path segment", () => {
    expect(() =>
      parseListing("old-site", oldSiteBody([{ name: "../x.xlsx", url: "https://example.test/a" }])),
    ).toThrow(/not a single path segment/);
  });

  it("reads a report-index listing, naming each file after the last URL segment", () => {
    const listing = parseListing(
      "report-index",
      reportIndexBody([
        {
          title: "10-Detailed Results",
          xlsx_url: "https://example.test/files//10-Detailed_Results_123.xlsx",
        },
        { title: "Index card", xlsx_url: null },
      ]),
    );
    expect(listing.electionName).toBe("Test General Election 2031");
    expect(listing.reports.get("10-Detailed Results")).toEqual({
      title: "10-Detailed Results",
      fileName: "10-Detailed_Results_123.xlsx",
      downloadUrl: "https://example.test/files//10-Detailed_Results_123.xlsx",
    });
    expect(listing.reports.has("Index card")).toBe(false);
  });

  it("rejects a report-index listing that does not report success", () => {
    expect(() => parseListing("report-index", { ...reportIndexBody([]), success: false })).toThrow(
      /success is not true/,
    );
  });

  it("rejects a report-index URL that is not https", () => {
    expect(() =>
      parseListing(
        "report-index",
        reportIndexBody([{ title: "2-Winners", xlsx_url: "http://example.test/2.xlsx" }]),
      ),
    ).toThrow(/is not https/);
  });

  it("rejects a repeated report title", () => {
    expect(() =>
      parseListing(
        "report-index",
        reportIndexBody([
          { title: "2-Winners", xlsx_url: "https://example.test/a.xlsx" },
          { title: "2-Winners", xlsx_url: "https://example.test/b.xlsx" },
        ]),
      ),
    ).toThrow(/repeats the report 2-Winners/);
  });
});
