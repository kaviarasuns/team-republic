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

const HEADER_2026 = [
  "STATE/UT NAME",
  "AC NO.",
  "AC NAME",
  "CANDIDATE NAME",
  "GENDER",
  "AGE",
  "CATEGORY",
  "PARTY",
  "SYMBOL",
  "GENERAL",
  "POSTAL",
  "TOTAL",
  "OVER VALID VOTES + NOTA",
  "OVER TOTAL ELECTORS",
  "TOTAL ELECTORS",
];

/** The 2026 layout: GENDER, two percentage columns, "(SC)" name suffix, "Nota". */
const addDetailedSheet2026 = (sheet: Worksheet) => {
  sheet.addRow(["10 - Detailed Results"]);
  sheet.addRow([]);
  sheet.addRow(["", "", "", "", "", "", "", "", "", "TOTAL VALID VOTES POLLED + NOTA"]);
  sheet.addRow(HEADER_2026);
  const ac = ["Tamil Nadu", 2, "TEST AC (SC)"];
  sheet.addRow([...ac, "1 Candidate A", "MALE", 50, "SC", "TPA", "Sun", 8, 2, 10, 66.67, 50, 20]);
  sheet.addRow([...ac, "2 Candidate B", "FEMALE", 45, "SC", "IND", "Box", 3, 1, 4, 26.67, 20, 20]);
  sheet.addRow([...ac, "3 Nota", "", "", "", "NOTA", "NOTA", 1, 0, 1, 6.67, 5, 20]);
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
    "-",
    75,
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

  it("reads the 2026 layout: electors from column 15, the (SC) suffix, and a mixed-case Nota line", () => {
    const workbook = newWorkbook();
    addDetailedSheet2026(workbook.addWorksheet("Worksheet"));
    const constituency = parseDetailedResults(workbook).constituencies[0];
    expect(constituency?.number).toBe(2);
    expect(constituency?.name).toBe("TEST AC");
    expect(constituency?.reservationSuffix).toBe("SC");
    expect(constituency?.electors).toBe(20);
    expect(constituency?.nota).toMatchObject({ totalVotes: 1, sourceRow: 7 });
    expect(constituency?.candidates.map((candidate) => [candidate.name, candidate.sex])).toEqual([
      ["Candidate A", "MALE"],
      ["Candidate B", "FEMALE"],
    ]);
  });

  it("leaves reservationSuffix null for a name without one", () => {
    const workbook = newWorkbook();
    addDetailedSheet(workbook.addWorksheet("Worksheet"));
    expect(parseDetailedResults(workbook).constituencies[0]?.reservationSuffix).toBeNull();
  });
});
