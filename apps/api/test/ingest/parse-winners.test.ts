import { describe, expect, it } from "@effect/vitest";
import { newWorkbook } from "../../src/ingest/excel.ts";
import { parseWinners } from "../../src/ingest/parse-winners.ts";

// Synthetic fixture. These names and numbers are not election results.

describe("parseWinners", () => {
  it("reads winner rows and skips the party-wise summary", () => {
    const workbook = newWorkbook();
    const sheet = workbook.addWorksheet("Worksheet");
    sheet.addRow(["2 - List of Successful Candidates"]);
    sheet.addRow(["STATE/UT", "CONSTITUENCY", "WINNER", "SEX", "PARTY", "SYMBOL"]);
    sheet.addRow(["Tamil Nadu", "Test AC", "Candidate A", "M", "TPA", "Sun"]);
    sheet.addRow(["Tamil Nadu", "Other AC", "Candidate B", "F", "IND", "Box"]);
    sheet.addRow([]);
    sheet.addRow(["", "", "PARTY WISE SUMMARY"]);
    sheet.addRow(["", "", "PARTY NAME", "", "SEATS"]);
    sheet.addRow(["", "", "Test Party A", "", 1]);
    sheet.addRow(["Disclaimer"]);
    expect(parseWinners(workbook)).toEqual([
      {
        constituencyName: "Test AC",
        candidateName: "Candidate A",
        partyAbbreviation: "TPA",
        sourceSheet: "Worksheet",
        sourceRow: 3,
      },
      {
        constituencyName: "Other AC",
        candidateName: "Candidate B",
        partyAbbreviation: "IND",
        sourceSheet: "Worksheet",
        sourceRow: 4,
      },
    ]);
  });

  it("rejects a repeated constituency name", () => {
    const workbook = newWorkbook();
    const sheet = workbook.addWorksheet("Worksheet");
    sheet.addRow(["STATE/UT", "CONSTITUENCY", "WINNER", "SEX", "PARTY", "SYMBOL"]);
    sheet.addRow(["Tamil Nadu", "Test AC", "Candidate A", "M", "TPA", "Sun"]);
    sheet.addRow(["Tamil Nadu", "Test AC", "Candidate B", "F", "IND", "Box"]);
    expect(() => parseWinners(workbook)).toThrow(/duplicate constituency/);
  });
});
