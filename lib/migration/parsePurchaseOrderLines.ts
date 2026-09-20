// lib/migration/parsePurchaseOrderLines.ts

import { PurchaseOrderLine } from "@/types/purchase-order";

export interface RawExcelLine {
  // Support formatted display headers
  "Line Type"?: string;
  "Item Code"?: string;
  "G/L Account Code"?: string;
  "Description"?: string;
  "Quantity"?: number | string;
  "Unit Cost"?: number | string;
  "Warehouse Code"?: string;
  "Discount Type"?: string;
  "Discount Value"?: number | string;
  "VAT Rate (%)"?: number | string;

  // Support snake_case headers
  line_type?: string;
  item_code?: string;
  account_code?: string;
  description?: string;
  quantity?: number | string;
  unit_cost?: number | string;
  warehouse_code?: string;
  discount_type?: string;
  discount_value?: number | string;
  vat_rate?: number | string;

  [key: string]: unknown;
}

export interface ParsedLineResult {
  rowNumber: number;
  raw: RawExcelLine;
  normalized?: {
    line_type: "ITEM" | "GL_ACCOUNT";
    item_code?: string;
    account_code?: string;
    description?: string;
    quantity: number;
    unit_cost: number;
    warehouse_code?: string;
    discount_type: "PERCENT" | "FIXED";
    discount_value: number;
    vat_rate?: number;
  };
  errors: string[];
}

export function parsePurchaseOrderLineRow(
  row: RawExcelLine,
  rowNumber: number
): ParsedLineResult {
  const errors: string[] = [];

  // 1. Line Type
  const rawLineType = row["Line Type"] ?? row["line_type"] ?? "ITEM";
  const lineType = String(rawLineType).trim().toUpperCase();

  if (lineType !== "ITEM" && lineType !== "GL_ACCOUNT") {
    errors.push(`Invalid Line Type '${rawLineType}'. Must be 'ITEM' or 'GL_ACCOUNT'.`);
  }

  // 2. Extracted values
  const itemCode = String(row["Item Code"] ?? row["item_code"] ?? "").trim();
  const accountCode = String(
    row["G/L Account Code"] ?? row["account_code"] ?? ""
  ).trim();
  const description = String(
    row["Description"] ?? row["description"] ?? ""
  ).trim();

  // 3. Quantity & Cost
  const rawQty = row["Quantity"] ?? row["quantity"] ?? 1;
  const qty = Number(rawQty);
  if (isNaN(qty) || qty <= 0) {
    errors.push("Quantity must be a positive number greater than 0.");
  }

  const rawUnitCost = row["Unit Cost"] ?? row["unit_cost"] ?? 0;
  const unitCost = Number(rawUnitCost);
  if (isNaN(unitCost) || unitCost < 0) {
    errors.push("Unit Cost cannot be negative.");
  }

  // 4. Warehouse & Code specifics
  const warehouseCode = String(
    row["Warehouse Code"] ?? row["warehouse_code"] ?? ""
  ).trim();

  if (lineType === "ITEM") {
    if (!itemCode) errors.push("Item Code is required for ITEM rows.");
    if (!warehouseCode) errors.push("Warehouse Code is required for ITEM rows.");
  } else if (lineType === "GL_ACCOUNT") {
    if (!accountCode) errors.push("G/L Account Code is required for GL_ACCOUNT rows.");
  }

  // 5. Discount & VAT
  const rawDiscountType = row["Discount Type"] ?? row["discount_type"] ?? "PERCENT";
  const discountType =
    String(rawDiscountType).trim().toUpperCase() === "FIXED"
      ? "FIXED"
      : "PERCENT";

  const rawDiscountValue = row["Discount Value"] ?? row["discount_value"] ?? 0;
  const discountValue = isNaN(Number(rawDiscountValue)) ? 0 : Number(rawDiscountValue);

  const rawVatRate = row["VAT Rate (%)"] ?? row["vat_rate"];
  const vatRate =
    rawVatRate !== undefined && rawVatRate !== null && rawVatRate !== ""
      ? Number(rawVatRate)
      : undefined;

  if (errors.length > 0) {
    return { rowNumber, raw: row, errors };
  }

  return {
    rowNumber,
    raw: row,
    errors: [],
    normalized: {
      line_type: lineType as "ITEM" | "GL_ACCOUNT",
      item_code: itemCode,
      account_code: accountCode,
      description,
      quantity: qty,
      unit_cost: unitCost,
      warehouse_code: warehouseCode,
      discount_type: discountType as "PERCENT" | "FIXED",
      discount_value: discountValue,
      vat_rate: vatRate,
    },
  };
}

/* // lib/migration/parsePurchaseOrderLines.ts

import { PurchaseOrderLine } from "@/types/purchase-order";

export interface RawExcelLine {
  // Support formatted display headers
  "Line Type"?: string;
  "Item Code"?: string;
  "G/L Account Code"?: string;
  Description?: string;
  Quantity?: number | string;
  "Unit Cost"?: number | string;
  "Warehouse Code"?: string;
  "Discount Type"?: string;
  "Discount Value"?: number | string;
  "VAT Rate (%)"?: number | string;

  // Fallback to snake_case headers
  line_type?: string;
  item_code?: string;
  account_code?: string;
  description?: string;
  quantity?: number | string;
  unit_cost?: number | string;
  warehouse_code?: string;
  discount_type?: string;
  discount_value?: number | string;
  vat_rate?: number | string;

  // Index signature for dynamic header matching
  //   [key: string]: any;
}

export interface ValidationError {
  rowNumber: number;
  message: string;
}

export async function processImportedLines(
  rawRows: RawExcelLine[],
  purchasePostingGroupId?: string,
): Promise<{ lines: PurchaseOrderLine[]; errors: ValidationError[] }> {
  const errors: ValidationError[] = [];
  const processedLines: PurchaseOrderLine[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2; // Accounting for Excel header row (Row 1)

    // Extract values with priority on display headers, falling back to snake_case
    const rawLineType = row["Line Type"] ?? row["line_type"] ?? "ITEM";
    const lineType = String(rawLineType).trim().toUpperCase();

    const itemCode = String(row["Item Code"] ?? row["item_code"] ?? "").trim();
    const accountCode = String(
      row["G/L Account Code"] ?? row["account_code"] ?? "",
    ).trim();
    const description = String(
      row["Description"] ?? row["description"] ?? "",
    ).trim();

    const rawQty = row["Quantity"] ?? row["quantity"] ?? 1;
    const qty = Number(rawQty);

    const rawUnitCost = row["Unit Cost"] ?? row["unit_cost"] ?? 0;
    const unitCost = Number(rawUnitCost);

    const warehouseCode = String(
      row["Warehouse Code"] ?? row["warehouse_code"] ?? "",
    ).trim();

    const rawDiscountType =
      row["Discount Type"] ?? row["discount_type"] ?? "PERCENT";
    const discountType =
      String(rawDiscountType).trim().toUpperCase() === "FIXED"
        ? "FIXED"
        : "PERCENT";

    const rawDiscountValue =
      row["Discount Value"] ?? row["discount_value"] ?? 0;
    const discountValue = Number(rawDiscountValue);

    const rawVatRate = row["VAT Rate (%)"] ?? row["vat_rate"];

    // 1. Line Type Validation
    if (lineType !== "ITEM" && lineType !== "GL_ACCOUNT") {
      errors.push({
        rowNumber: rowNum,
        message: `Invalid Line Type '${rawLineType}'. Must be 'ITEM' or 'GL_ACCOUNT'.`,
      });
      continue;
    }

    // 2. Quantity & Cost Parsing
    if (isNaN(qty) || qty <= 0) {
      errors.push({
        rowNumber: rowNum,
        message: `Quantity must be a positive number greater than 0.`,
      });
      continue;
    }

    if (isNaN(unitCost) || unitCost < 0) {
      errors.push({
        rowNumber: rowNum,
        message: `Unit cost cannot be negative.`,
      });
      continue;
    }

    // 3. Discount Setup
    const safeDiscountValue =
      isNaN(discountValue) || discountValue < 0 ? 0 : discountValue;

    // 4. Resolve ITEM or G/L Details via lookups
    let lineData: Partial<PurchaseOrderLine> = {
      line_type: lineType as "ITEM" | "GL_ACCOUNT",
      quantity: qty,
      unit_cost: unitCost,
      discount_type: discountType as "PERCENT" | "FIXED",
      discount_value: safeDiscountValue,
      description: description,
      is_allocated: false,
      received_quantity: 0,
    };

    if (lineType === "ITEM") {
      if (!itemCode) {
        errors.push({
          rowNumber: rowNum,
          message: `Item Code is required for ITEM rows.`,
        });
        continue;
      }

      if (!warehouseCode) {
        errors.push({
          rowNumber: rowNum,
          message: `Warehouse Code is required for ITEM rows.`,
        });
        continue;
      }

      // Fetch Item and Warehouse metadata from backend lookups
      try {
        const [itemRes, whRes] = await Promise.all([
          fetch(`/api/lookups/items?code=${encodeURIComponent(itemCode)}`),
          fetch(
            `/api/lookups/warehouses?code=${encodeURIComponent(warehouseCode)}`,
          ),
        ]);

        const itemJson = await itemRes.json();
        const whJson = await whRes.json();

        const item = itemJson.data?.[0];
        const warehouse = whJson.data?.[0];

        if (!item) {
          errors.push({
            rowNumber: rowNum,
            message: `Item code '${itemCode}' not found in database.`,
          });
          continue;
        }

        if (!warehouse) {
          errors.push({
            rowNumber: rowNum,
            message: `Warehouse code '${warehouseCode}' not found in database.`,
          });
          continue;
        }

        const resolvedVatPercent =
          rawVatRate !== undefined && rawVatRate !== null && rawVatRate !== ""
            ? Number(rawVatRate)
            : Number(item.vat_rate ?? 0);

        lineData = {
          ...lineData,
          item_id: item.id,
          item_code: item.item_code,
          item_name: item.name,
          description: description || item.name,
          uom_id: item.base_uom_id,
          uom_name: item.base_uom_name,
          warehouse_id: warehouse.id,
          warehouse_code: warehouse.code,
          warehouse_name: warehouse.name,
          vat_product_posting_group_id: item.vat_product_group_id,
          vat_business_posting_group_id: purchasePostingGroupId,
          vat_percent: resolvedVatPercent,
        };
      } catch (err) {
        errors.push({
          rowNumber: rowNum,
          message: `Failed to resolve lookup data for Item '${itemCode}' or Warehouse '${warehouseCode}'.`,
        });
        continue;
      }
    } else {
      // G/L Account Validation
      if (!accountCode) {
        errors.push({
          rowNumber: rowNum,
          message: `G/L Account Code is required for GL_ACCOUNT rows.`,
        });
        continue;
      }

      try {
        const glRes = await fetch(
          `/api/lookups/gl-accounts?code=${encodeURIComponent(accountCode)}`,
        );
        const glJson = await glRes.json();
        const account = glJson.data?.[0];

        if (!account) {
          errors.push({
            rowNumber: rowNum,
            message: `G/L Account code '${accountCode}' not found in database.`,
          });
          continue;
        }

        const resolvedVatPercent =
          rawVatRate !== undefined && rawVatRate !== null && rawVatRate !== ""
            ? Number(rawVatRate)
            : 0;

        lineData = {
          ...lineData,
          gl_account_id: account.id,
          account_code: account.code,
          account_name: account.name,
          description: description || account.name,
          vat_percent: resolvedVatPercent,
        };
      } catch (err) {
        errors.push({
          rowNumber: rowNum,
          message: `Failed to resolve lookup data for G/L Account '${accountCode}'.`,
        });
        continue;
      }
    }

    // 5. Amount Calculations
    const original = qty * unitCost;
    const discountAmount =
      discountType === "PERCENT"
        ? original * (safeDiscountValue / 100)
        : safeDiscountValue;
    const net = Math.max(0, original - discountAmount);
    const vatPercent = Number(lineData.vat_percent || 0);
    const vatAmount = net * (vatPercent / 100);

    processedLines.push({
      ...(lineData as PurchaseOrderLine),
      original_amount: original,
      discount_amount: discountAmount,
      net_amount: net,
      vat_amount: vatAmount,
      gross_amount: net + vatAmount,
    });
  }

  return { lines: processedLines, errors };
}
 */