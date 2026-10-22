import { describe, expect, it } from "@effect/vitest";
import type { Worksheet } from "exceljs";
import { newWorkbook } from "../../src/ingest/excel.ts";
import { parseDetailedResults } from "../../src/ingest/parse-detailed-results.ts";

// Synthetic fixture. These names and numbers are not election results.

const HEADER = [
  "STATE/UT NAME",
  "AC NO.",
  "AC NAME",
  "CANDIDATE NAME",
  "SEX",
  "AGE",
  "CATEGORY",
  "PARTY",
  "SYMBOL",
  "GENERAL",
  "POSTAL",
  "TOTAL",
  "% VOTES POLLED",
  "TOTAL ELECTORS",
];

const addDetailedSheet = (sheet: Worksheet) => {
  sheet.addRow(["10 - Detailed Results"]);
  sheet.addRow([]);
  sheet.addRow(["", "", "", "", "", "", "", "", "", "VALID VOTES POLLED"]);
  sheet.addRow(HEADER);
  sheet.addRow([
    "Tamil Nadu",
    1,
    "Test AC",
    "1 Candidate A",
    "MALE",
    60,
    "GENERAL",
    "TPA",
    "Sun",
    8,
    2,
    10,
    50,
    100,
  ]);
  sheet.addRow([
    "Tamil Nadu",
    1,
    "Test AC",
    "2 Candidate B",
    "THIRD",
    "",
    "",
    "IND",
    "Box",
    3,
    1,
    4,
    20,
    100,
  ]);
  sheet.addRow(["Tamil Nadu", 1, "Test AC", "3 NOTA", "", "", "", "NOTA", "NOTA", 1, 0, 1, 5, 100]);
  sheet.addRow([
    "TURN OUT",
    "TURN OUT",
    "TURN OUT",
    "",
    "",
    "",
    "TOTAL:",
    "TOTAL:",
    "TOTAL:",
    12,
    3,
    15,
    15,
  ]);
  sheet.addRow(["GRAND TOTAL:", "GRAND TOTAL:", "GRAND TOTAL:", "", "", "", "", "", "", 12, 3, 15]);
  sheet.addRow(["Disclaimer"]);
};

describe("parseDetailedResults", () => {
  it("reads the published header layout, strips the rank prefix, and keeps NOTA off the candidate list", () => {
    const workbook = newWorkbook();
    addDetailedSheet(workbook.addWorksheet("Worksheet"));
    const parsed = parseDetailedResults(workbook);
    expect(parsed.sheet).toBe("Worksheet");
    expect(parsed.constituencies).toHaveLength(1);
    const constituency = parsed.constituencies[0];
    expect(constituency?.number).toBe(1);
    expect(constituency?.name).toBe("Test AC");
    expect(constituency?.electors).toBe(100);
    expect(constituency?.nota).toMatchObject({
      totalVotes: 1,
      generalVotes: 1,
      postalVotes: 0,
      sourceRow: 7,
    });
    expect(constituency?.printedTotal.sourceRow).toBe(8);
    expect(
      constituency?.candidates.map((candidate) => [
        candidate.fileRank,
        candidate.name,
        candidate.partyAbbreviation,
        candidate.sex,
        candidate.age,
        candidate.category,
      ]),
    ).toEqual([
      [1, "Candidate A", "TPA", "MALE", 60, "GENERAL"],
      [2, "Candidate B", "IND", "THIRD", null, null],
    ]);
    expect(constituency?.candidates[0]?.sourceRow).toBe(5);
    expect(parsed.grandTotal).toMatchObject({
      generalVotes: 12,
      postalVotes: 3,
      totalVotes: 15,
      sourceRow: 9,
    });
  });

  it("rejects a sheet whose header is not the Detailed Results header", () => {
    const workbook = newWorkbook();
    const sheet = workbook.addWorksheet("Worksheet");
    sheet.addRow(["AC", "Name"]);
    expect(() => parseDetailedResults(workbook)).toThrow(/header row not found/);
  });

  it("rejects an ambiguous NOTA line", () => {
    const workbook = newWorkbook();
    const sheet = workbook.addWorksheet("Worksheet");
    sheet.addRow(HEADER);
    sheet.addRow([
      "Tamil Nadu",
      1,
      "Test AC",
      "1 Candidate A",
      "MALE",
      40,
      "GENERAL",
      "NOTA",
      "Sun",
      1,
      0,
      1,
      1,
      10,
    ]);
    sheet.addRow(["TURN OUT", "", "", "", "", "", "", "", "", 1, 0, 1]);
    sheet.addRow(["GRAND TOTAL:", "", "", "", "", "", "", "", "", 1, 0, 1]);
    expect(() => parseDetailedResults(workbook)).toThrow(/ambiguous NOTA/);
  });

  it("rejects a second sheet", () => {
    const workbook = newWorkbook();
    addDetailedSheet(workbook.addWorksheet("Worksheet"));
    workbook.addWorksheet("Extra");
    expect(() => parseDetailedResults(workbook)).toThrow(/expected 1 sheet/);
  });
});
