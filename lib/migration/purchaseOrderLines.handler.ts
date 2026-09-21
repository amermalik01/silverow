// lib/migration/modules/purchaseOrderLines.handler.ts

import {
  MigrationHandler,
  MigrationRow,
  MigrationContext,
  MigrationRowResult,
  MigrationResult,
} from "./migration.types";
import {
  parsePurchaseOrderLineRow,
  RawExcelLine,
} from "./parsePurchaseOrderLines";
import { pool } from "@/lib/db";

export const purchaseOrderLinesHandler: MigrationHandler = {
  async validate(
    rows: MigrationRow[],
    context: MigrationContext,
  ): Promise<MigrationRowResult[]> {
    const results: MigrationRowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // Row offset for Excel Header
      const rawLine = rows[i] as RawExcelLine;
      const parsed = parsePurchaseOrderLineRow(rawLine, rowNum);

      if (parsed.errors.length > 0) {
        results.push({
          row: rowNum,
          success: false,
          errors: parsed.errors,
        });
        continue;
      }

      const { normalized } = parsed;
      const rowErrors: string[] = [];

      //   console.log('normalized ==== ',normalized)

      // Server-side entity lookups via raw SQL
      if (normalized?.line_type === "ITEM") {
        const itemRes = await pool.query(
          `SELECT id, item_code FROM items WHERE company_id = $1 AND item_code = $2 LIMIT 1`,
          [context.company_id, normalized.item_code],
        );

        if (itemRes.rowCount === 0) {
          rowErrors.push(`Item code '${normalized.item_code}' not found.`);
        }

        const warehouseRes = await pool.query(
          `SELECT id, code FROM warehouses WHERE company_id = $1 AND code = $2 LIMIT 1`,
          [context.company_id, normalized.warehouse_code],
        );

        if (warehouseRes.rowCount === 0) {
          rowErrors.push(
            `Warehouse code '${normalized.warehouse_code}' not found.`,
          );
        }
      } else if (normalized?.line_type === "GL_ACCOUNT") {
        const glAccountRes = await pool.query(
          `SELECT id, code FROM chart_of_accounts WHERE company_id = $1 AND code = $2 LIMIT 1`,
          [context.company_id, normalized.account_code],
        );

        if (glAccountRes.rowCount === 0) {
          rowErrors.push(`G/L Account '${normalized.account_code}' not found.`);
        }
      }

      results.push({
        row: rowNum,
        success: rowErrors.length === 0,
        errors: rowErrors,
        data: normalized,
      });
    }

    return results;
  },

  async execute(
    rows: MigrationRow[],
    context: MigrationContext,
  ): Promise<MigrationResult> {
    const validationResults = await this.validate(rows, context);

    let successCount = 0;
    let failedCount = 0;
    const rowResults: MigrationRowResult[] = [];

    let lineNo = 10000;

    // 1. Fetch Purchase Order Header to obtain Business Posting Group
    const poHeaderRes = await pool.query(
      `SELECT vat_business_posting_group_id,supplier_posting_group_id FROM purchase_orders WHERE id = $1 AND company_id = $2 LIMIT 1`,
      [context.purchase_order_id, context.company_id],
    );

    const busPostingGroupId =
      poHeaderRes.rows[0]?.vat_business_posting_group_id ||
      poHeaderRes.rows[0]?.supplier_posting_group_id ||
      null;

    for (let i = 0; i < validationResults.length; i++) {
      const val = validationResults[i];

      if (!val.success || !val.data) {
        failedCount++;
        rowResults.push(val);
        continue;
      }

      const norm = val.data as NonNullable<
        ReturnType<typeof parsePurchaseOrderLineRow>["normalized"]
      >;

      try {
        // let vatPercent = norm.vat_rate ?? 0;

        let itemId: string | null = null;
        let uomId: string | null = null;
        let warehouseId: string | null = null;
        let glAccountId: string | null = null;
        let lineDescription = norm.description || "";
        let vatProductGroupId: string | null = null;

        // console.log("norm === ", norm);
        // console.log("lineNo === ", lineNo);

        if (norm.line_type === "ITEM") {
          const itemRes = await pool.query(
            `SELECT id, item_code, name, description, base_uom_id, vat_product_group_id
             FROM items 
             WHERE company_id = $1 AND item_code = $2 
             LIMIT 1`,
            [context.company_id, norm.item_code],
          );
          const item = itemRes.rows[0];

          const warehouseRes = await pool.query(
            `SELECT id, code, name 
             FROM warehouses 
             WHERE company_id = $1 AND code = $2 
             LIMIT 1`,
            [context.company_id, norm.warehouse_code],
          );
          const warehouse = warehouseRes.rows[0];

          // if (norm.vat_rate === undefined) {
          //   vatPercent = Number(item?.vat_rate ?? 0);
          // }

          itemId = item.id;
          lineDescription = norm.description || item.name;
          uomId = item.base_uom_id;
          warehouseId = warehouse.id;
          vatProductGroupId = item.vat_product_group_id || null;
        } else {
          const glRes = await pool.query(
            `SELECT id, code, name,vat_rate_id
             FROM chart_of_accounts 
             WHERE company_id = $1 AND code = $2 
             LIMIT 1`,
            [context.company_id, norm.account_code],
          );
          const glAccount = glRes.rows[0];

          glAccountId = glAccount.id;
          lineDescription = norm.description || glAccount.name;
          vatProductGroupId = glAccount?.vat_rate_id || null;
        }

        // console.log("vatProductGroupId === ", vatProductGroupId);

        // 3. Resolve VAT Percentage from Setup Matrix or Excel Fallback

        // if (norm.vat_rate !== undefined) {
        //   const validVatRes = await pool.query(
        //     `SELECT DISTINCT vat_percent
        //     FROM vat_posting_setup
        //     WHERE company_id = $1 AND vat_percent = $2 LIMIT 1`,
        //     [context.company_id, norm.vat_rate],
        //   );

        //   if ((validVatRes.rowCount ?? 0) === 0) {
        //     rowErrors.push(
        //       `Invalid VAT Rate '${norm.vat_rate}%'. Please provide a valid configured VAT rate.`,
        //     );
        //   }
        // }

        let vatPercent = norm.vat_rate ?? 0;

        if (norm.vat_rate === undefined && vatProductGroupId) {
          // Resolve exact rate based on business + product group setup
          const vatSetupRes = await pool.query(
            `SELECT vat_percent 
             FROM vat_posting_setup 
             WHERE company_id = $1 
               AND vat_product_posting_group_id = $2
               ${busPostingGroupId ? "AND vat_business_posting_group_id = $3" : ""}
             LIMIT 1`,
            busPostingGroupId
              ? [context.company_id, vatProductGroupId, busPostingGroupId]
              : [context.company_id, vatProductGroupId],
          );

          if ((vatSetupRes.rowCount ?? 0) > 0) {
            vatPercent = Number(vatSetupRes.rows[0].vat_percent || 0);
          }
        }

        // Calculations
        const originalAmount = norm.quantity * norm.unit_cost;

        const discountAmount =
          norm.discount_type === "PERCENT"
            ? originalAmount * (norm.discount_value / 100)
            : norm.discount_value;

        const netAmount = Math.max(0, originalAmount - discountAmount);
        const vatAmount = netAmount * (vatPercent / 100);
        const grossAmount = netAmount + vatAmount;

        // Raw SQL Insert
        const insertQuery = `
          INSERT INTO purchase_order_lines (
            company_id,
            purchase_order_id,

            line_no,
            line_type,

            item_id,
            gl_account_id,

            description,

            warehouse_id,
            uom_id,

            quantity,
            received_quantity,

            unit_cost,

            discount_type,
            discount_value,
            discount_amount,

            vat_percent,
            vat_amount,

            net_amount,
            gross_amount,

            is_deleted,

            created_at

          ) VALUES (
            $1,$2,$3,$4,
            $5,$6,$7,$8,
            $9,$10,$11,$12,
            $13,$14,$15,$16,
            $17,$18,$19,
            false,
            NOW()
          )
        `;

        const insertParams = [
          context.company_id,
          context.purchase_order_id,

          lineNo,
          norm.line_type,

          itemId || null,
          glAccountId || null,
          lineDescription || null,

          warehouseId || null,
          uomId || null,

          norm.quantity || 0,
          0, // received_quantity

          norm.unit_cost || 0,

          norm.discount_type || null,
          norm.discount_value || 0,
          discountAmount || 0,

          vatPercent || 0,
          vatAmount || 0,

          netAmount || 0,
          grossAmount || 0,
        ];

        // console.log("insertQuery ==== ", insertQuery);
        // console.log("insertParams ==== ", insertParams);

        await pool.query(insertQuery, insertParams);

        successCount++;
        lineNo += 10000;

        rowResults.push({
          row: val.row,
          success: true,
          errors: [],
        });
      } catch (err) {
        failedCount++;

        rowResults.push({
          row: val.row,
          success: false,
          errors: [
            err instanceof Error
              ? err.message
              : "Failed to persist line record.",
          ],
        });

        // console.log("rowResults === ", rowResults);
      }
    }

    return {
      total: rows.length,
      success: successCount,
      failed: failedCount,
      rows: rowResults,
    };
  },
};

// let itemCode: string | null = null;
// let itemName: string | null = null;
// let uomName: string | null = null;
// let warehouseCode: string | null = null;
// let warehouseName: string | null = null;
// let vatProductPostingGroupId: string | null = null;
// let accountCode: string | null = null;
// let accountName: string | null = null;
// itemCode = item.item_code;
// itemName = item.name;
// uomName = item.base_uom_name;
// warehouseCode = warehouse.code;
// warehouseName = warehouse.name;

// warehouseName = warehouse.code + " - " + warehouse.name;

// vatProductPostingGroupId = item.vat_product_group_id;
// accountCode = glAccount.code;
// accountName = glAccount.name;

// company_id,
// purchase_order_id,

// line_no,
// line_type,

// item_id,
// gl_account_id,

// description,

// quantity,
// unit_cost,
// discount_type,
// discount_value,
// description,
// received_quantity,
// vat_percent,
// original_amount,
// discount_amount,
// net_amount,
// vat_amount,
// gross_amount,

// uom_id,
// uom_name,
// warehouse_id,
// warehouse_name,
// vat_product_posting_group_id
