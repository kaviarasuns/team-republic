import type { Row, Workbook, Worksheet } from "exceljs";
import { cell, cellText, parseCount } from "./cell-value.ts";
import { ingestFail } from "./errors.ts";

/**
 * "8- Constituency Data Summary.xlsx": one sheet per AC, named
 * `S22-<number>-<name>` (234 sheets). There is no district cell.
 *
 * Row 2 of each sheet is:
 * State/UT | S22-Tamil Nadu | Constituency Name | `<number>-<name>-<GEN|SC|ST>`
 * Names themselves contain hyphens ("Chepauk-Thiruvallikeni"), so the
 * reservation is only the GEN/SC/ST suffix.
 *
 * Electors are the row whose column B is exactly "4. Total" (section
 * "II. Electors"); the total is column F. NOTA is the row whose column B
 * contains "VOTES POLLED FOR 'NOTA' (INCLUDING POSTAL)"; column F is that
 * total. A different row mentions postal votes polled for NOTA as a
 * deduction and is not the total.
 * Detailed Results is still the source for the stored NOTA votes; this file
 * is used to cross-check them and to read the reservation.
 */

export type Reservation = "GEN" | "SC" | "ST";

export interface ParsedConstituencySummary {
  readonly number: number;
  readonly name: string;
  readonly reservation: Reservation;
  readonly district: string | null;
  readonly electors: number;
  readonly electorsRow: number;
  readonly notaVotes: number;
  readonly notaRow: number;
  readonly sourceSheet: string;
  readonly headerRow: number;
}

const NAME_PATTERN = /^(\d+)-(.+)-(GEN|SC|ST)$/;
const STATE_LABEL = "S22-Tamil Nadu";

const sheetRows = (sheet: Worksheet): { rowNumber: number; row: Row }[] => {
  const rows: { rowNumber: number; row: Row }[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rows.push({ rowNumber, row });
  });
  return rows;
};

const isReservation = (value: string): value is Reservation =>
  value === "GEN" || value === "SC" || value === "ST";

const findRows = (
  rows: readonly { rowNumber: number; row: Row }[],
  sheetName: string,
  match: (row: Row, rowNumber: number) => boolean,
  description: string,
): { rowNumber: number; row: Row }[] => {
  const found = rows.filter(({ row, rowNumber }) => match(row, rowNumber));
  if (found.length !== 1) {
    ingestFail(`sheet ${sheetName}: expected one ${description} row, found ${found.length}`);
  }
  return found;
};

const parseSheet = (sheet: Worksheet): ParsedConstituencySummary => {
  const rows = sheetRows(sheet);
  const header = findRows(
    rows,
    sheet.name,
    (row, rowNumber) =>
      cell(row, 3, `sheet ${sheet.name} row ${rowNumber}`) === "Constituency Name",
    '"Constituency Name"',
  )[0];
  if (header === undefined) ingestFail(`sheet ${sheet.name}: missing constituency header`);
  const where = `sheet ${sheet.name} row ${header.rowNumber}`;
  const stateLabel = cell(header.row, 1, where);
  const state = cell(header.row, 2, where);
  if (stateLabel !== "State/UT" || state !== STATE_LABEL) {
    ingestFail(
      `${where}: expected State/UT ${STATE_LABEL}, found ${JSON.stringify(stateLabel)} ${JSON.stringify(state)}`,
    );
  }
  const headline = cell(header.row, 4, where);
  const match = NAME_PATTERN.exec(headline);
  if (match === null) {
    ingestFail(
      `${where}: constituency cell ${JSON.stringify(headline)} is not "<number>-<name>-<GEN|SC|ST>"`,
    );
  }
  const number = parseCount(match[1] ?? "", `${where} AC number`);
  const name = match[2] ?? "";
  const reservationText = match[3] ?? "";
  if (name === "" || !isReservation(reservationText)) {
    ingestFail(`${where}: could not read name and reservation from ${JSON.stringify(headline)}`);
  }
  const expectedSheet = `S22-${number}-${name}`;
  if (sheet.name !== expectedSheet) {
    ingestFail(
      `sheet ${JSON.stringify(sheet.name)} does not match constituency cell ${JSON.stringify(headline)}`,
    );
  }

  const electorsRow = findRows(
    rows,
    sheet.name,
    (row, rowNumber) => cell(row, 2, `sheet ${sheet.name} row ${rowNumber}`) === "4. Total",
    '"4. Total" electors',
  )[0];
  if (electorsRow === undefined) ingestFail(`sheet ${sheet.name}: missing electors total`);
  const electors = parseCount(
    cell(electorsRow.row, 6, `sheet ${sheet.name} row ${electorsRow.rowNumber}`),
    `sheet ${sheet.name} electors`,
  );

  const notaRow = findRows(
    rows,
    sheet.name,
    (row, rowNumber) =>
      cell(row, 2, `sheet ${sheet.name} row ${rowNumber}`).includes(
        "VOTES POLLED FOR 'NOTA' (INCLUDING POSTAL)",
      ),
    "NOTA",
  )[0];
  if (notaRow === undefined) ingestFail(`sheet ${sheet.name}: missing NOTA total`);
  const notaVotes = parseCount(
    cell(notaRow.row, 6, `sheet ${sheet.name} row ${notaRow.rowNumber}`),
    `sheet ${sheet.name} NOTA votes`,
  );

  const districtHits: { rowNumber: number; column: number }[] = [];
  for (const { row, rowNumber } of rows) {
    const last = Math.max(row.cellCount, 1);
    for (let column = 1; column <= last; column++) {
      if (cellText(row.getCell(column).value).toLowerCase() === "district") {
        districtHits.push({ rowNumber, column });
      }
    }
  }
  let district: string | null = null;
  if (districtHits.length > 1) {
    ingestFail(`sheet ${sheet.name}: "District" appears ${districtHits.length} times`);
  }
  const districtHit = districtHits[0];
  if (districtHit !== undefined) {
    const value = cell(
      sheet.getRow(districtHit.rowNumber),
      districtHit.column + 1,
      `sheet ${sheet.name} district`,
    );
    if (value === "")
      ingestFail(`sheet ${sheet.name} row ${districtHit.rowNumber}: District label has no value`);
    district = value;
  }

  return {
    number,
    name,
    reservation: reservationText,
    district,
    electors,
    electorsRow: electorsRow.rowNumber,
    notaVotes,
    notaRow: notaRow.rowNumber,
    sourceSheet: sheet.name,
    headerRow: header.rowNumber,
  };
};

export const parseConstituencySummaries = (
  workbook: Workbook,
): readonly ParsedConstituencySummary[] => {
  if (workbook.worksheets.length === 0) ingestFail("Constituency summary: workbook has no sheets");
  return workbook.worksheets.map((sheet) => parseSheet(sheet));
};
