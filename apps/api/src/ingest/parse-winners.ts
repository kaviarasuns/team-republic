import type { Row, Workbook, Worksheet } from "exceljs";
import { cell, parseCount } from "./cell-value.ts";
import { splitReservationSuffix } from "./constituency-name.ts";
import { STATE_NAME } from "./elections.ts";
import { ingestFail } from "./errors.ts";

/**
 * The one sheet in "2- List of Successful Candidates.xlsx". Two published
 * layouts are recognised by their exact header row.
 *
 * 2021: STATE/UT | CONSTITUENCY | WINNER | SEX | PARTY | SYMBOL. There is no
 * constituency number. After the winner rows the sheet has a party-wise seat
 * summary (columns C–E) and a disclaimer; those rows have an empty STATE/UT
 * cell and are not winners.
 *
 * Both layouts end the winner rows at a "PARTY WISE SUMMARY" label; nothing
 * from that label on is read as a winner.
 *
 * 2026: a band row labels columns E–K "WINNER" and L–O "RUNNER-UP", then:
 * SR No. | STATE/UT | AC No. | CONSTITUENCY | Name | SEX | PARTY | SYMBOL | AGE |
 * SOCIAL CATEGORY | VOTES SECURED | Name | SEX | PARTY | VOTES SECURED |
 * WINNING MARGIN. Reserved seats print "PONNERI (SC)"; the suffix is dropped
 * here because the summary sheet is the reservation source.
 */

export interface ParsedRunnerUp {
  readonly partyAbbreviation: string;
  readonly totalVotes: number;
}

export interface ParsedWinner {
  /** Null in the 2021 layout, which prints no AC number. */
  readonly constituencyNumber: number | null;
  readonly constituencyName: string;
  readonly candidateName: string;
  readonly partyAbbreviation: string;
  /** The winner's votes; null when the layout does not print them. */
  readonly totalVotes: number | null;
  /** Null when the layout prints no runner-up. */
  readonly runnerUp: ParsedRunnerUp | null;
  /** Winner votes minus runner-up votes as printed; null when not printed. */
  readonly margin: number | null;
  readonly sourceSheet: string;
  readonly sourceRow: number;
}

interface Layout {
  readonly header: readonly string[];
  readonly read: (row: Row, where: string) => Omit<ParsedWinner, "sourceSheet" | "sourceRow">;
  readonly stateColumn: number;
  readonly constituencyColumn: number;
}

const required = (value: string, what: string, where: string): string => {
  if (value === "") ingestFail(`${where}: winner row is missing ${what}`);
  return value;
};

const LAYOUTS: readonly Layout[] = [
  {
    header: ["STATE/UT", "CONSTITUENCY", "WINNER", "SEX", "PARTY", "SYMBOL"],
    stateColumn: 1,
    constituencyColumn: 2,
    read: (row, where) => ({
      constituencyNumber: null,
      constituencyName: required(cell(row, 2, where), "a constituency", where),
      candidateName: required(cell(row, 3, where), "a name", where),
      partyAbbreviation: required(cell(row, 5, where), "a party", where),
      totalVotes: null,
      runnerUp: null,
      margin: null,
    }),
  },
  {
    header: [
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
    ],
    stateColumn: 2,
    constituencyColumn: 4,
    read: (row, where) => ({
      constituencyNumber: parseCount(cell(row, 3, where), `${where} AC number`),
      constituencyName: splitReservationSuffix(
        required(cell(row, 4, where), "a constituency", where),
      ).name,
      candidateName: required(cell(row, 5, where), "a name", where),
      partyAbbreviation: required(cell(row, 7, where), "a party", where),
      totalVotes: parseCount(cell(row, 11, where), `${where} winner votes`),
      runnerUp: {
        partyAbbreviation: required(cell(row, 14, where), "a runner-up party", where),
        totalVotes: parseCount(cell(row, 15, where), `${where} runner-up votes`),
      },
      margin: parseCount(cell(row, 16, where), `${where} winning margin`),
    }),
  },
];

const sheetRows = (sheet: Worksheet): { rowNumber: number; row: Row }[] => {
  const rows: { rowNumber: number; row: Row }[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rows.push({ rowNumber, row });
  });
  return rows;
};

const isDisclaimer = (text: string): boolean =>
  text === "Disclaimer" || text.startsWith("This report is based on Index Cards");

const PARTY_SUMMARY = "PARTY WISE SUMMARY";

/** The label that starts the party-wise seat summary: column C in 2021, column A in 2026. */
const isPartySummary = (row: Row, rowNumber: number): boolean =>
  [1, 2, 3].some((column) => cell(row, column, `winners row ${rowNumber}`) === PARTY_SUMMARY);

const layoutOf = (row: Row, rowNumber: number): Layout | null =>
  LAYOUTS.find((layout) =>
    layout.header.every((expected, index) => cell(row, index + 1, `row ${rowNumber}`) === expected),
  ) ?? null;

export const parseWinners = (workbook: Workbook): readonly ParsedWinner[] => {
  if (workbook.worksheets.length !== 1) {
    ingestFail(
      `Successful candidates: expected 1 sheet, found ${workbook.worksheets.length} (${workbook.worksheets.map((sheet) => sheet.name).join(", ")})`,
    );
  }
  const sheet = workbook.worksheets[0];
  if (sheet === undefined) ingestFail("Successful candidates: workbook has no sheet");

  const rows = sheetRows(sheet);
  const headerIndex = rows.findIndex(({ row, rowNumber }) => layoutOf(row, rowNumber) !== null);
  const headerRow = rows[headerIndex];
  const layout = headerRow === undefined ? null : layoutOf(headerRow.row, headerRow.rowNumber);
  if (layout === null)
    ingestFail(`Successful candidates sheet ${sheet.name}: header row not found`);

  const body = rows.slice(headerIndex + 1);
  const summaryIndex = body.findIndex(({ row, rowNumber }) => isPartySummary(row, rowNumber));
  const winnerRows = summaryIndex === -1 ? body : body.slice(0, summaryIndex);

  const winners: ParsedWinner[] = [];
  const seenNames = new Set<string>();
  const seenNumbers = new Set<number>();
  for (const { row, rowNumber } of winnerRows) {
    const where = `winners row ${rowNumber}`;
    const firstCell = cell(row, 1, where);
    const state = cell(row, layout.stateColumn, where);
    const constituencyCell = cell(row, layout.constituencyColumn, where);
    if (state === "" && constituencyCell === "") continue;
    if (isDisclaimer(firstCell)) continue;
    if (state !== STATE_NAME) {
      ingestFail(`${where}: expected state ${STATE_NAME}, found ${JSON.stringify(state)}`);
    }
    for (let column = layout.header.length + 1; column <= row.cellCount; column++) {
      const extra = cell(row, column, where);
      if (extra !== "")
        ingestFail(`${where} column ${column}: unexpected value ${JSON.stringify(extra)}`);
    }
    const winner = layout.read(row, where);
    // Two ACs can share a printed name (2026 prints AC 50 and AC 185 both as
    // "TIRUPPATTUR"), so names only have to be unique when there is no number.
    if (winner.constituencyNumber === null) {
      if (seenNames.has(winner.constituencyName))
        ingestFail(`${where}: duplicate constituency ${JSON.stringify(winner.constituencyName)}`);
      seenNames.add(winner.constituencyName);
    } else {
      if (seenNumbers.has(winner.constituencyNumber))
        ingestFail(`${where}: duplicate AC number ${winner.constituencyNumber}`);
      seenNumbers.add(winner.constituencyNumber);
    }
    winners.push({ ...winner, sourceSheet: sheet.name, sourceRow: rowNumber });
  }
  if (winners.length === 0) ingestFail("Successful candidates: no winner rows");
  return winners;
};
