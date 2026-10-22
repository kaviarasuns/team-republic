import type { Row, Workbook, Worksheet } from "exceljs";
import { cell, parseCount, parseOptionalCount } from "./cell-value.ts";
import { ingestFail } from "./errors.ts";
import { STATE_NAME } from "./tn2021-constants.ts";

/**
 * Sheet "Worksheet" in "10- Detailed Results.xlsx", inspected 2026-10-22.
 *
 * Row 1 is the title. Row 3 is a merged label "VALID VOTES POLLED" over the
 * vote columns. The header row (row 4 in the published file) is:
 * STATE/UT NAME, AC NO., AC NAME, CANDIDATE NAME, SEX, AGE, CATEGORY, PARTY,
 * SYMBOL, GENERAL, POSTAL, TOTAL, % VOTES POLLED, TOTAL ELECTORS.
 *
 * CANDIDATE NAME is printed as "<rank> <name>", for example "1 GOVINDARAJAN T.J".
 * That leading integer is the file's rank. It counts the NOTA line too, so a
 * candidate after NOTA keeps the printed number (1, 2, 4, …) and the sequence
 * skips. There is no separate rank column.
 *
 * NOTA is a line whose name is "<rank> NOTA" and whose party is NOTA. It has
 * no sex, age, or category. Each constituency then has a TURN OUT row whose
 * GENERAL, POSTAL, and TOTAL cells are the printed constituency totals. The
 * sheet ends with one GRAND TOTAL row, a blank row, and a disclaimer.
 */

export interface VoteBreakdown {
  readonly generalVotes: number | null;
  readonly postalVotes: number | null;
  readonly totalVotes: number;
}

export interface ParsedCandidate {
  readonly name: string;
  /** Null when the name cell has no "<rank> <name>" prefix. */
  readonly fileRank: number | null;
  readonly sex: string | null;
  readonly age: number | null;
  readonly category: string | null;
  readonly partyAbbreviation: string;
  readonly votes: VoteBreakdown;
  readonly sourceSheet: string;
  readonly sourceRow: number;
}

export interface ParsedTotal extends VoteBreakdown {
  readonly sourceSheet: string;
  readonly sourceRow: number;
}

export interface ParsedConstituencyResult {
  readonly number: number;
  readonly name: string;
  readonly electors: number | null;
  /** The NOTA line. Number, name, electors, and NOTA votes are all on this row. */
  readonly nota: ParsedTotal;
  readonly candidates: readonly ParsedCandidate[];
  readonly printedTotal: ParsedTotal;
}

export interface ParsedDetailedResults {
  readonly sheet: string;
  readonly constituencies: readonly ParsedConstituencyResult[];
  readonly grandTotal: ParsedTotal;
}

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
] as const;

const COL = {
  state: 1,
  number: 2,
  name: 3,
  candidate: 4,
  sex: 5,
  age: 6,
  category: 7,
  party: 8,
  general: 10,
  postal: 11,
  total: 12,
  electors: 14,
} as const;

const NOTA_NAME = /^(\d+)\s+NOTA$/;
const RANKED_NAME = /^(\d+)\s+(\S(?:.*\S)?)$/;

interface OpenConstituency {
  readonly number: number;
  readonly name: string;
  readonly sourceSheet: string;
  readonly candidates: ParsedCandidate[];
  nota: ParsedTotal | null;
  readonly electors: Set<string>;
}

const sheetRows = (sheet: Worksheet): { rowNumber: number; row: Row }[] => {
  const rows: { rowNumber: number; row: Row }[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rows.push({ rowNumber, row });
  });
  return rows;
};

const headerMatches = (row: Row, rowNumber: number): boolean =>
  HEADER.every((expected, index) => cell(row, index + 1, `row ${rowNumber}`) === expected);

const votesOf = (row: Row, rowNumber: number, where: string): VoteBreakdown => ({
  generalVotes: parseOptionalCount(cell(row, COL.general, where), `${where} general votes`),
  postalVotes: parseOptionalCount(cell(row, COL.postal, where), `${where} postal votes`),
  totalVotes: parseCount(cell(row, COL.total, where), `${where} total votes`),
});

const assertNoExtraColumns = (row: Row, rowNumber: number) => {
  for (let column = HEADER.length + 1; column <= row.cellCount; column++) {
    const value = cell(row, column, `row ${rowNumber}`);
    if (value !== "")
      ingestFail(`row ${rowNumber} column ${column}: unexpected value ${JSON.stringify(value)}`);
  }
};

const isDisclaimer = (state: string): boolean =>
  state === "Disclaimer" || state.startsWith("This report is based on Index Cards");

export const parseDetailedResults = (workbook: Workbook): ParsedDetailedResults => {
  if (workbook.worksheets.length !== 1) {
    ingestFail(
      `Detailed Results: expected 1 sheet, found ${workbook.worksheets.length} (${workbook.worksheets.map((sheet) => sheet.name).join(", ")})`,
    );
  }
  const sheet = workbook.worksheets[0];
  if (sheet === undefined) ingestFail("Detailed Results: workbook has no sheet");

  const rows = sheetRows(sheet);
  const headerIndex = rows.findIndex(({ row, rowNumber }) => headerMatches(row, rowNumber));
  if (headerIndex === -1) {
    ingestFail(
      `Detailed Results sheet ${sheet.name}: header row not found (${HEADER.join(" | ")})`,
    );
  }
  if (rows.slice(headerIndex + 1).some(({ row, rowNumber }) => headerMatches(row, rowNumber))) {
    ingestFail(`Detailed Results sheet ${sheet.name}: header row appears more than once`);
  }

  const constituencies: ParsedConstituencyResult[] = [];
  const seen = new Set<number>();
  let current: OpenConstituency | null = null;
  let grandTotal: ParsedTotal | null = null;

  const close = (printedTotal: ParsedTotal) => {
    const open = current;
    if (open === null)
      ingestFail(`row ${printedTotal.sourceRow}: TURN OUT row with no constituency`);
    if (open.nota === null) {
      ingestFail(
        `AC ${open.number} ${open.name}: no NOTA row before the TURN OUT row ${printedTotal.sourceRow}`,
      );
    }
    if (open.electors.size !== 1) {
      ingestFail(
        `AC ${open.number} ${open.name}: TOTAL ELECTORS is not the same on every row (${[...open.electors].join(", ")})`,
      );
    }
    const electorsText = [...open.electors][0] ?? "";
    const electors =
      electorsText === "" ? null : parseCount(electorsText, `AC ${open.number} total electors`);
    if (seen.has(open.number))
      ingestFail(`AC number ${open.number} appears twice in Detailed Results`);
    seen.add(open.number);
    constituencies.push({
      number: open.number,
      name: open.name,
      electors,
      nota: open.nota,
      candidates: open.candidates,
      printedTotal,
    });
    current = null;
  };

  for (const { row, rowNumber } of rows.slice(headerIndex + 1)) {
    const where = `row ${rowNumber}`;
    const state = cell(row, COL.state, where);
    if (state === "TURN OUT") {
      assertNoExtraColumns(row, rowNumber);
      close({ ...votesOf(row, rowNumber, where), sourceSheet: sheet.name, sourceRow: rowNumber });
      continue;
    }
    if (state === "GRAND TOTAL:") {
      if (current !== null) {
        ingestFail(`row ${rowNumber}: GRAND TOTAL before AC ${current.number} had a TURN OUT row`);
      }
      if (grandTotal !== null) ingestFail(`row ${rowNumber}: a second GRAND TOTAL row`);
      assertNoExtraColumns(row, rowNumber);
      grandTotal = {
        ...votesOf(row, rowNumber, where),
        sourceSheet: sheet.name,
        sourceRow: rowNumber,
      };
      continue;
    }
    if (state === "" || isDisclaimer(state)) {
      if (current !== null)
        ingestFail(`row ${rowNumber}: constituency ${current.number} ended without a TURN OUT row`);
      continue;
    }
    if (grandTotal !== null) ingestFail(`row ${rowNumber}: data after the GRAND TOTAL row`);
    if (state !== STATE_NAME)
      ingestFail(`row ${rowNumber}: expected state ${STATE_NAME}, found ${JSON.stringify(state)}`);

    assertNoExtraColumns(row, rowNumber);
    const number = parseCount(cell(row, COL.number, where), `${where} AC number`);
    const name = cell(row, COL.name, where);
    if (name === "") ingestFail(`${where}: AC name is blank`);
    const rawName = cell(row, COL.candidate, where);
    const party = cell(row, COL.party, where);
    if (current === null) {
      current = {
        number,
        name,
        sourceSheet: sheet.name,
        candidates: [],
        nota: null,
        electors: new Set(),
      };
    } else if (current.number !== number) {
      ingestFail(`${where}: AC ${number} started before AC ${current.number} had a TURN OUT row`);
    } else if (current.name !== name) {
      ingestFail(
        `${where}: AC ${number} name changed from ${JSON.stringify(current.name)} to ${JSON.stringify(name)}`,
      );
    }
    current.electors.add(cell(row, COL.electors, where));

    const notaName = NOTA_NAME.test(rawName) || rawName === "NOTA";
    const notaParty = party === "NOTA";
    if (notaName || notaParty) {
      if (!NOTA_NAME.test(rawName) || !notaParty) {
        ingestFail(
          `${where}: ambiguous NOTA line (name ${JSON.stringify(rawName)}, party ${JSON.stringify(party)})`,
        );
      }
      if (current.nota !== null) ingestFail(`${where}: AC ${number} has a second NOTA row`);
      current.nota = {
        ...votesOf(row, rowNumber, where),
        sourceSheet: sheet.name,
        sourceRow: rowNumber,
      };
      continue;
    }
    if (party === "") ingestFail(`${where}: party is blank`);
    if (rawName === "") ingestFail(`${where}: candidate name is blank`);

    const ranked = RANKED_NAME.exec(rawName);
    const fileRank = ranked === null ? null : parseCount(ranked[1] ?? "", `${where} rank`);
    const candidateName = ranked === null ? rawName : (ranked[2] ?? "");
    if (candidateName === "") ingestFail(`${where}: candidate name is blank after the rank prefix`);
    const sex = cell(row, COL.sex, where);
    const age = parseOptionalCount(cell(row, COL.age, where), `${where} age`);
    const category = cell(row, COL.category, where);
    current.candidates.push({
      name: candidateName,
      fileRank,
      sex: sex === "" ? null : sex,
      age,
      category: category === "" ? null : category,
      partyAbbreviation: party,
      votes: votesOf(row, rowNumber, where),
      sourceSheet: sheet.name,
      sourceRow: rowNumber,
    });
  }

  if (current !== null)
    ingestFail(`AC ${current.number} ${current.name}: sheet ended without a TURN OUT row`);
  if (grandTotal === null) ingestFail("Detailed Results: no GRAND TOTAL row");
  return { sheet: sheet.name, constituencies, grandTotal };
};
