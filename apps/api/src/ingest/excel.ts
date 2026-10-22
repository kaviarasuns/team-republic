import { createRequire } from "node:module";
import type { Workbook } from "exceljs";
import { Effect } from "effect";
import { IngestError } from "./errors.ts";

const require = createRequire(import.meta.url);

// exceljs is CommonJS and its types have no default export. Node cannot see
// named exports through that interop, so load the constructor this way.
const exceljs = require("exceljs") as {
  readonly Workbook: new () => Workbook;
};

export const newWorkbook = (): Workbook => new exceljs.Workbook();

export const loadWorkbook = (bytes: Uint8Array, fileName: string) =>
  Effect.tryPromise({
    try: async () => {
      const workbook = new exceljs.Workbook();
      await workbook.xlsx.load(Buffer.from(bytes) as never);
      return workbook;
    },
    catch: (cause) =>
      new IngestError({
        message: `Could not read ${fileName}: ${cause instanceof Error ? cause.message : String(cause)}`,
      }),
  });
