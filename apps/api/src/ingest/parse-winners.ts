import type { Row, Workbook, Worksheet } from "exceljs";
import { cell } from "./cell-value.ts";
import { ingestFail } from "./errors.ts";
import { STATE_NAME } from "./tn2021-constants.ts";

/**
 * Sheet "Worksheet" in "2- List of Successful Candidates.xlsx".
 *
 * Header: STATE/UT | CONSTITUENCY | WINNER | SEX | PARTY | SYMBOL.
 * There is no constituency number. After the 234 winner rows the sheet has a
 * party-wise seat summary (columns C–E) and a disclaimer. Those rows have an
 * empty STATE/UT cell and are not winners.
 */

export interface ParsedWinner {
  readonly constituencyName: string;
  readonly candidateName: string;
  readonly partyAbbreviation: string;
  readonly sourceSheet: string;
  readonly sourceRow: number;
}

const HEADER = ["STATE/UT", "CONSTITUENCY", "WINNER", "SEX", "PARTY", "SYMBOL"] as const;

const sheetRows = (sheet: Worksheet): { rowNumber: number; row: Row }[] => {
  const rows: { rowNumber: number; row: Row }[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rows.push({ rowNumber, row });
  });
  return rows;
};

const isDisclaimer = (text: string): boolean =>
  text === "Disclaimer" || text.startsWith("This report is based on Index Cards");

export const parseWinners = (workbook: Workbook): readonly ParsedWinner[] => {
  if (workbook.worksheets.length !== 1) {
    ingestFail(
      `Successful candidates: expected 1 sheet, found ${workbook.worksheets.length} (${workbook.worksheets.map((sheet) => sheet.name).join(", ")})`,
    );
  }
  const sheet = workbook.worksheets[0];
  if (sheet === undefined) ingestFail("Successful candidates: workbook has no sheet");

  const rows = sheetRows(sheet);
  const headerIndex = rows.findIndex(({ row, rowNumber }) =>
    HEADER.every((expected, index) => cell(row, index + 1, `row ${rowNumber}`) === expected),
  );
  if (headerIndex === -1)
    ingestFail(`Successful candidates sheet ${sheet.name}: header row not found`);

  const winners: ParsedWinner[] = [];
  const seen = new Set<string>();
  for (const { row, rowNumber } of rows.slice(headerIndex + 1)) {
    const where = `winners row ${rowNumber}`;
    const state = cell(row, 1, where);
    const constituencyName = cell(row, 2, where);
    if (state === "" && constituencyName === "") continue;
    if (isDisclaimer(state)) continue;
    if (state !== STATE_NAME) {
      ingestFail(`${where}: expected state ${STATE_NAME}, found ${JSON.stringify(state)}`);
    }
    const candidateName = cell(row, 3, where);
    const partyAbbreviation = cell(row, 5, where);
    if (constituencyName === "" || candidateName === "" || partyAbbreviation === "") {
      ingestFail(`${where}: winner row is missing a constituency, a name, or a party`);
    }
    if (seen.has(constituencyName))
      ingestFail(`${where}: duplicate constituency ${JSON.stringify(constituencyName)}`);
    seen.add(constituencyName);
    for (let column = HEADER.length + 1; column <= row.cellCount; column++) {
      const extra = cell(row, column, where);
      if (extra !== "")
        ingestFail(`${where} column ${column}: unexpected value ${JSON.stringify(extra)}`);
    }
    winners.push({
      constituencyName,
      candidateName,
      partyAbbreviation,
      sourceSheet: sheet.name,
      sourceRow: rowNumber,
    });
  }
  if (winners.length === 0) ingestFail("Successful candidates: no winner rows");
  return winners;
};
