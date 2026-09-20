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
        let vatPercent = norm.vat_rate ?? 0;

        // Base values common to all line types
        let itemId: string | null = null;
        let itemCode: string | null = null;
        let itemName: string | null = null;
        let uomId: string | null = null;
        let uomName: string | null = null;
        let warehouseId: string | null = null;
        // let warehouseCode: string | null = null;
        let warehouseName: string | null = null;
        let vatProductPostingGroupId: string | null = null;
        let glAccountId: string | null = null;
        let accountCode: string | null = null;
        let accountName: string | null = null;
        let lineDescription = norm.description || "";

        console.log("norm === ", norm);

        if (norm.line_type === "ITEM") {
          const itemRes = await pool.query(
            `SELECT id, item_code, name, vat_rate, base_uom_id, base_uom_name, vat_product_group_id 
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

          if (norm.vat_rate === undefined) {
            vatPercent = Number(item?.vat_rate ?? 0);
          }

          itemId = item.id;
          itemCode = item.item_code;
          itemName = item.name;
          lineDescription = norm.description || item.name;
          uomId = item.base_uom_id;
          uomName = item.base_uom_name;
          warehouseId = warehouse.id;
          //   warehouseCode = warehouse.code;
          //   warehouseName = warehouse.name;

          warehouseName = warehouse.code + " - " + warehouse.name;

          vatProductPostingGroupId = item.vat_product_group_id;
        } else {
          const glRes = await pool.query(
            `SELECT id, code, name 
             FROM chart_of_accounts 
             WHERE company_id = $1 AND code = $2 
             LIMIT 1`,
            [context.company_id, norm.account_code],
          );
          const glAccount = glRes.rows[0];

          glAccountId = glAccount.id;
          accountCode = glAccount.code;
          accountName = glAccount.name;
          lineDescription = norm.description || glAccount.name;
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
            line_type,
            quantity,
            unit_cost,
            discount_type,
            discount_value,
            description,
            received_quantity,
            vat_percent,
            original_amount,
            discount_amount,
            net_amount,
            vat_amount,
            gross_amount,
            item_id,
            item_code,
            item_name,
            uom_id,
            uom_name,
            warehouse_id,
            warehouse_name,
            vat_product_posting_group_id,
            gl_account_id,
            account_code
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25
          )
        `;

        const insertParams = [
          context.company_id,
          context.purchase_order_id,
          norm.line_type,
          norm.quantity,
          norm.unit_cost,
          norm.discount_type,
          norm.discount_value,
          lineDescription,
          0, // received_quantity
          vatPercent,
          originalAmount,
          discountAmount,
          netAmount,
          vatAmount,
          grossAmount,
          itemId,
          itemCode,
          itemName,
          uomId,
          uomName,
          warehouseId,
          warehouseName,
          vatProductPostingGroupId,
          glAccountId,
          accountCode,
        ];

        await pool.query(insertQuery, insertParams);

        successCount++;
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
      }

      //   } catch (err: any) {
      //     failedCount++;
      //     rowResults.push({
      //       row: val.row,
      //       success: false,
      //       errors: [err?.message || "Failed to persist line record."],
      //     });
      //   }
    }

    return {
      total: rows.length,
      success: successCount,
      failed: failedCount,
      rows: rowResults,
    };
  },
};
