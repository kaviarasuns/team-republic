import { describe, expect, it } from "@effect/vitest";
import { newWorkbook } from "../../src/ingest/excel.ts";
import { parseParties } from "../../src/ingest/parse-parties.ts";

// Synthetic fixture. These names and numbers are not election results.

const addParties2026 = (allPartiesCount: number) => {
  const workbook = newWorkbook();
  const sheet = workbook.addWorksheet("Worksheet");
  sheet.addRow(["PARTY TYPE", "ABBREVIATION", "PARTY"]);
  sheet.addRow(["NATIONAL PARTIES"]);
  sheet.addRow([1, "TPA", "Test Party A"]);
  sheet.addRow(["STATE PARTIES"]);
  sheet.addRow([2, "TPB", "Test Party B"]);
  sheet.addRow([null, null, null]);
  sheet.addRow(["Summary Table", "Summary Table", "Summary Table"]);
  sheet.addRow(["Party Type", "Party Type", "No. of Parties Participated"]);
  sheet.addRow(["NATIONAL PARTIES", "NATIONAL PARTIES", 1]);
  sheet.addRow(["STATE PARTIES", "STATE PARTIES", 1]);
  sheet.addRow([
    "All Parties (Excluding NOTA and Independents)",
    "All Parties (Excluding NOTA and Independents)",
    allPartiesCount,
  ]);
  sheet.addRow(["Disclaimer"]);
  return workbook;
};

describe("parseParties", () => {
  it("skips section labels and keeps the serial row as the source row", () => {
    const workbook = newWorkbook();
    const sheet = workbook.addWorksheet("Worksheet");
    sheet.addRow(["3 - List Of Political Parties Participated"]);
    sheet.addRow(["PARTY TYPE", "ABBREVIATION", "PARTY"]);
    sheet.addRow(["NATIONAL PARTIES"]);
    sheet.addRow([1, "TPA", "Test Party A"]);
    sheet.addRow([
      "STATE PARTIES - OTHER STATES",
      "STATE PARTIES - OTHER STATES",
      "STATE PARTIES - OTHER STATES",
    ]);
    sheet.addRow([2, "IND", "Independent"]);
    sheet.addRow([3, "NOTA", "None of the Above"]);
    sheet.addRow(["Disclaimer"]);
    const parties = parseParties(workbook);
    expect(parties).toEqual([
      { abbreviation: "TPA", name: "Test Party A", sourceSheet: "Worksheet", sourceRow: 4 },
      { abbreviation: "IND", name: "Independent", sourceSheet: "Worksheet", sourceRow: 6 },
      { abbreviation: "NOTA", name: "None of the Above", sourceSheet: "Worksheet", sourceRow: 7 },
    ]);
  });

  it("rejects a duplicate abbreviation", () => {
    const workbook = newWorkbook();
    const sheet = workbook.addWorksheet("Worksheet");
    sheet.addRow(["PARTY TYPE", "ABBREVIATION", "PARTY"]);
    sheet.addRow([1, "TPA", "Test Party A"]);
    sheet.addRow([2, "TPA", "Test Party Again"]);
    expect(() => parseParties(workbook)).toThrow(/duplicate party abbreviation TPA/);
  });

  it("rejects a row that is neither a party nor a section label", () => {
    const workbook = newWorkbook();
    const sheet = workbook.addWorksheet("Worksheet");
    sheet.addRow(["PARTY TYPE", "ABBREVIATION", "PARTY"]);
    sheet.addRow(["mystery", "TPA", "Test Party A"]);
    expect(() => parseParties(workbook)).toThrow(/unrecognised row/);
  });

  it("reads the 2026 list, which has no IND or NOTA row and ends in a summary table", () => {
    expect(parseParties(addParties2026(2)).map((party) => party.abbreviation)).toEqual([
      "TPA",
      "TPB",
    ]);
  });

  it("rejects a summary table whose party count differs from the list", () => {
    expect(() => parseParties(addParties2026(3))).toThrow(
      /summary table counts 3 parties, the list has 2/,
    );
  });
});
