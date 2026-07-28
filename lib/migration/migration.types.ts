// lib/migration/migration.types.ts

export type MigrationModule = "PURCHASE_ORDER_LINES";
// export type MigrationModule =
//   | "PURCHASE_ORDER_LINES"
//   | "SALES_ORDER_LINES"
//   | "ITEMS"
//   | "CUSTOMERS"
//   | "SUPPLIERS";

export type MigrationCellValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export type MigrationRow = Record<string, MigrationCellValue>;

export interface MigrationContext {
  company_id: string;
  user_id?: string;
  purchase_order_id: string;
}

export interface MigrationRowResult {
  row: number;
  success: boolean;
  data?: unknown;
  errors: string[];
}

export interface MigrationResult {
  total: number;
  success: number;
  failed: number;
  rows: MigrationRowResult[];
}

export interface MigrationHandler {
  validate(
    rows: MigrationRow[],
    context: MigrationContext,
  ): Promise<MigrationRowResult[]>;

  execute(
    rows: MigrationRow[],
    context: MigrationContext,
  ): Promise<MigrationResult>;
}

export interface MigrationUploadResponse {
  rows: MigrationRow[];
}

export type MigrationExecuteResponse = MigrationResult;