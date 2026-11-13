import { describe, expect, it } from "@effect/vitest";
import { newWorkbook } from "../../src/ingest/excel.ts";
import { parseWinners } from "../../src/ingest/parse-winners.ts";

// Synthetic fixture. These names and numbers are not election results.

const HEADER_2026 = [
  "SR No.",
  "STATE/UT",
  "AC No.",
  "CONSTITUENCY",
  "Name",
  "SEX",
  "PARTY",
  "SYMBOL",
  "AGE",
  "SOCIAL CATEGORY",
  "VOTES SECURED",
  "Name",
  "SEX",
  "PARTY",
  "VOTES SECURED",
  "WINNING MARGIN",
];

const winner2026 = (serial: number, number: number, constituency: string, name: string) => [
  serial,
  "Tamil Nadu",
  number,
  constituency,
  name,
  "M",
  "TPA",
  "Sun",
  50,
  "GENERAL",
  10,
  "RUNNER UP",
  "F",
  "IND",
  4,
  6,
];

const addWinnersSheet2026 = (rows: readonly (readonly unknown[])[]) => {
  const workbook = newWorkbook();
  const sheet = workbook.addWorksheet("Worksheet");
  sheet.addRow(["2 - List of Successful Candidates"]);
  sheet.addRow(["", "", "", "", "WINNER", "WINNER", "", "", "", "", "", "RUNNER-UP"]);
  sheet.addRow(HEADER_2026);
  for (const row of rows) sheet.addRow([...row]);
  sheet.addRow([]);
  sheet.addRow(["PARTY WISE SUMMARY", "PARTY WISE SUMMARY", "PARTY WISE SUMMARY"]);
  sheet.addRow(["Tamil Nadu", "Tamil Nadu", "Tamil Nadu", "Winning Candidates"]);
  sheet.addRow(["Test Party A", "Test Party A", "Test Party A", 2]);
  sheet.addRow(["Disclaimer"]);
  return workbook;
};

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
        constituencyNumber: null,
        constituencyName: "Test AC",
        candidateName: "Candidate A",
        partyAbbreviation: "TPA",
        totalVotes: null,
        runnerUp: null,
        margin: null,
        sourceSheet: "Worksheet",
        sourceRow: 3,
      },
      {
        constituencyNumber: null,
        constituencyName: "Other AC",
        candidateName: "Candidate B",
        partyAbbreviation: "IND",
        totalVotes: null,
        runnerUp: null,
        margin: null,
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

  it("reads the 2026 layout with AC numbers, votes, runner-up and margin, and stops at the party summary", () => {
    const workbook = addWinnersSheet2026([
      winner2026(1, 7, "TEST AC (SC)", "Candidate A"),
      winner2026(2, 8, "OTHER AC", "Candidate C"),
    ]);
    expect(parseWinners(workbook)).toEqual([
      {
        constituencyNumber: 7,
        constituencyName: "TEST AC",
        candidateName: "Candidate A",
        partyAbbreviation: "TPA",
        totalVotes: 10,
        runnerUp: { partyAbbreviation: "IND", totalVotes: 4 },
        margin: 6,
        sourceSheet: "Worksheet",
        sourceRow: 4,
      },
      {
        constituencyNumber: 8,
        constituencyName: "OTHER AC",
        candidateName: "Candidate C",
        partyAbbreviation: "TPA",
        totalVotes: 10,
        runnerUp: { partyAbbreviation: "IND", totalVotes: 4 },
        margin: 6,
        sourceSheet: "Worksheet",
        sourceRow: 5,
      },
    ]);
  });

  it("accepts two ACs with the same name when each prints its AC number", () => {
    const workbook = addWinnersSheet2026([
      winner2026(1, 50, "SAME NAME", "Candidate A"),
      winner2026(2, 185, "SAME NAME", "Candidate B"),
    ]);
    expect(parseWinners(workbook).map((winner) => winner.constituencyNumber)).toEqual([50, 185]);
  });

  it("rejects a repeated AC number", () => {
    const workbook = addWinnersSheet2026([
      winner2026(1, 7, "TEST AC", "Candidate A"),
      winner2026(2, 7, "OTHER AC", "Candidate B"),
    ]);
    expect(() => parseWinners(workbook)).toThrow(/duplicate AC number 7/);
  });
});
