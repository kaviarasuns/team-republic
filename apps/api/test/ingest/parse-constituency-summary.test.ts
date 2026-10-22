import { describe, expect, it } from "@effect/vitest";
import type { Worksheet } from "exceljs";
import { newWorkbook } from "../../src/ingest/excel.ts";
import { parseConstituencySummaries } from "../../src/ingest/parse-constituency-summary.ts";

// Synthetic fixture. These names and numbers are not election results.

const fillSummary = (sheet: Worksheet, headline: string, electors: number, nota: number) => {
  sheet.getRow(2).getCell(1).value = "State/UT";
  sheet.getRow(2).getCell(2).value = "S22-Tamil Nadu";
  sheet.getRow(2).getCell(3).value = "Constituency Name";
  sheet.getRow(2).getCell(4).value = headline;
  sheet.getRow(5).getCell(2).value = "4. Total";
  sheet.getRow(5).getCell(6).value = electors;
  sheet.getRow(7).getCell(2).value =
    "5. POSTAL VOTES DEDUCTED(REJECTED POSTAL VOTES + POSTAL VOTES POLLED FOR 'NOTA')";
  sheet.getRow(7).getCell(6).value = 999;
  sheet.getRow(8).getCell(2).value = "9. VOTES POLLED FOR 'NOTA' (INCLUDING POSTAL)";
  sheet.getRow(8).getCell(6).value = nota;
};

describe("parseConstituencySummaries", () => {
  it("reads reservation from the GEN/SC/ST suffix and keeps hyphens in the name", () => {
    const workbook = newWorkbook();
    fillSummary(workbook.addWorksheet("S22-1-Test AC"), "1-Test AC-SC", 1000, 7);
    fillSummary(
      workbook.addWorksheet("S22-2-Chepauk-Thiruvallikeni"),
      "2-Chepauk-Thiruvallikeni-GEN",
      50,
      1,
    );
    const summaries = parseConstituencySummaries(workbook);
    expect(
      summaries.map((summary) => [
        summary.number,
        summary.name,
        summary.reservation,
        summary.electors,
        summary.notaVotes,
        summary.district,
      ]),
    ).toEqual([
      [1, "Test AC", "SC", 1000, 7, null],
      [2, "Chepauk-Thiruvallikeni", "GEN", 50, 1, null],
    ]);
    expect(summaries[0]?.headerRow).toBe(2);
    expect(summaries[0]?.electorsRow).toBe(5);
    expect(summaries[0]?.notaRow).toBe(8);
  });

  it("rejects a reservation suffix that is not GEN, SC, or ST", () => {
    const workbook = newWorkbook();
    fillSummary(workbook.addWorksheet("S22-1-Test AC"), "1-Test AC-GENERAL", 10, 1);
    expect(() => parseConstituencySummaries(workbook)).toThrow(
      /not "<number>-<name>-<GEN\|SC\|ST>"/,
    );
  });

  it("rejects a sheet that does not print an electors total", () => {
    const workbook = newWorkbook();
    const sheet = workbook.addWorksheet("S22-1-Test AC");
    sheet.getRow(2).getCell(1).value = "State/UT";
    sheet.getRow(2).getCell(2).value = "S22-Tamil Nadu";
    sheet.getRow(2).getCell(3).value = "Constituency Name";
    sheet.getRow(2).getCell(4).value = "1-Test AC-GEN";
    expect(() => parseConstituencySummaries(workbook)).toThrow(/4\. Total/);
  });
});
