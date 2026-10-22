import type { CellValue, Row } from "exceljs";
import { ingestFail } from "./errors.ts";

/** Text of one cell, trimmed. Blank is "". Unsupported values abort. */
export const cellText = (value: CellValue): string => {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") {
    if (!Number.isFinite(value)) ingestFail(`non-finite number in a cell: ${String(value)}`);
    return String(value);
  }
  if (typeof value === "boolean") ingestFail(`unexpected boolean cell: ${String(value)}`);
  if (value instanceof Date) ingestFail(`unexpected date cell: ${value.toISOString()}`);
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((part) => part.text)
        .join("")
        .trim();
    }
    if ("result" in value) {
      const result = value.result;
      if (result == null) return "";
      if (typeof result === "object") ingestFail("a formula cell resolved to a non-scalar");
      return cellText(result as CellValue);
    }
    if ("text" in value && typeof value.text === "string") return value.text.trim();
  }
  ingestFail("unsupported cell value");
};

export const cell = (row: Row, column: number, where: string): string => {
  try {
    return cellText(row.getCell(column).value);
  } catch (cause) {
    if (cause instanceof Error) ingestFail(`${where}: ${cause.message}`);
    throw cause;
  }
};

/** A non-negative integer as printed. Blank is not accepted. */
export const parseCount = (text: string, where: string): number => {
  if (!/^\d+$/.test(text))
    ingestFail(`${where}: expected a non-negative integer, found ${JSON.stringify(text)}`);
  const value = Number(text);
  if (!Number.isSafeInteger(value)) ingestFail(`${where}: ${text} is not a safe integer`);
  return value;
};

/** Blank cell → null. Anything else must be a non-negative integer. */
export const parseOptionalCount = (text: string, where: string): number | null => {
  if (text === "") return null;
  return parseCount(text, where);
};
