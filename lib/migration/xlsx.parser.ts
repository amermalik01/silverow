// lib/migration/xlsx.parser.ts

import * as XLSX from "xlsx";
import type { MigrationRow } from "./migration.types";

export function parseXlsx(buffer: Buffer): MigrationRow[] {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
  });

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json<MigrationRow>(sheet, {
    defval: null,
  });

  //   return XLSX.utils.sheet_to_json(sheet, {
  //     defval: null,
  //   });
}
