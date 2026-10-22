import type { Row, Workbook, Worksheet } from "exceljs";
import { cell } from "./cell-value.ts";
import { ingestFail } from "./errors.ts";

/**
 * Sheet "Worksheet" in "3- List of Political Parties Participated.xlsx".
 *
 * Header: PARTY TYPE | ABBREVIATION | PARTY.
 * Data rows are `<serial> | <abbreviation> | <full name>`, including IND
 * (Independent) and NOTA (None of the Above). Section labels ("NATIONAL
 * PARTIES", "STATE PARTIES", …) occupy column A, sometimes repeated across
 * the merged row. A disclaimer follows the last row.
 */

export interface ParsedParty {
  readonly abbreviation: string;
  readonly name: string;
  readonly sourceSheet: string;
  readonly sourceRow: number;
}

const HEADER = ["PARTY TYPE", "ABBREVIATION", "PARTY"] as const;

const sheetRows = (sheet: Worksheet): { rowNumber: number; row: Row }[] => {
  const rows: { rowNumber: number; row: Row }[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rows.push({ rowNumber, row });
  });
  return rows;
};

const isDisclaimer = (text: string): boolean =>
  text === "Disclaimer" || text.startsWith("This report is based on Index Cards");

export const parseParties = (workbook: Workbook): readonly ParsedParty[] => {
  if (workbook.worksheets.length !== 1) {
    ingestFail(
      `Political parties: expected 1 sheet, found ${workbook.worksheets.length} (${workbook.worksheets.map((sheet) => sheet.name).join(", ")})`,
    );
  }
  const sheet = workbook.worksheets[0];
  if (sheet === undefined) ingestFail("Political parties: workbook has no sheet");

  const rows = sheetRows(sheet);
  const headerIndex = rows.findIndex(({ row, rowNumber }) =>
    HEADER.every((expected, index) => cell(row, index + 1, `row ${rowNumber}`) === expected),
  );
  if (headerIndex === -1) ingestFail(`Political parties sheet ${sheet.name}: header row not found`);

  const parties: ParsedParty[] = [];
  const seen = new Set<string>();
  for (const { row, rowNumber } of rows.slice(headerIndex + 1)) {
    const where = `parties row ${rowNumber}`;
    const serial = cell(row, 1, where);
    const abbreviation = cell(row, 2, where);
    const name = cell(row, 3, where);
    if (serial === "" && abbreviation === "" && name === "") continue;
    if (isDisclaimer(serial)) continue;
    if (!/^\d+$/.test(serial)) {
      const section =
        (abbreviation === "" || abbreviation === serial) && (name === "" || name === serial);
      if (section) continue;
      ingestFail(
        `${where}: unrecognised row ${JSON.stringify(serial)} / ${JSON.stringify(abbreviation)} / ${JSON.stringify(name)}`,
      );
    }
    if (abbreviation === "" || name === "") {
      ingestFail(`${where}: party serial ${serial} is missing an abbreviation or a name`);
    }
    if (abbreviation === name)
      ingestFail(`${where}: abbreviation and name are both ${JSON.stringify(abbreviation)}`);
    for (let column = 4; column <= row.cellCount; column++) {
      const extra = cell(row, column, where);
      if (extra !== "")
        ingestFail(`${where} column ${column}: unexpected value ${JSON.stringify(extra)}`);
    }
    if (seen.has(abbreviation))
      ingestFail(`${where}: duplicate party abbreviation ${abbreviation}`);
    seen.add(abbreviation);
    parties.push({ abbreviation, name, sourceSheet: sheet.name, sourceRow: rowNumber });
  }
  if (parties.length === 0) ingestFail("Political parties: no party rows");
  return parties;
};
