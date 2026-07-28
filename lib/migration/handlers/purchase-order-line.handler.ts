// lib/migration/handlers/purchase-order-line.handler.ts

import { pool } from "@/lib/db";
import { MigrationHandler, MigrationRow } from "../migration.types";
import { PurchaseOrderMigrationSchema } from "../validators/purchase-order-line.validator";
import { PurchaseOrderService } from "@/lib/services/purchase-orders/purchase-order.service";
import { PurchaseOrderLine } from "@/types/purchase-order";

async function resolveItem(companyId: string, code: string) {
  const result = await pool.query(
    `
        SELECT id, item_code, name, base_uom_id, standard_cost
        FROM items
        WHERE company_id=$1 AND item_code=$2 AND deleted_at IS NULL
    `,
    [companyId, code],
  );

  return result.rows[0];
}

async function resolveWarehouse(
  companyId: string,
  warehouseCode?: string | null,
) {
  if (warehouseCode) {
    const result = await pool.query(
      `
        SELECT id, code, name
        FROM warehouses
        WHERE company_id=$1
        AND code=$2
        `,
      [companyId, warehouseCode],
    );

    return result.rows[0];
  }

  const result = await pool.query(
    `
    SELECT id, code, name
    FROM warehouses
    WHERE company_id=$1 AND is_default=true
    LIMIT 1
    `,
    [companyId],
  );

  return result.rows[0];
}

export const purchaseOrderLineHandler: MigrationHandler = {
  async validate(rows: MigrationRow[], context) {
    const results = [];

    for (let i = 0; i < rows.length; i++) {
      const parsed = PurchaseOrderMigrationSchema.safeParse(rows[i]);

      results.push({
        row: i + 2,
        success: parsed.success,
        data: parsed.data,
        errors: parsed.success ? [] : parsed.error.issues.map((e) => e.message),
      });
    }

    return results;
  },

  async execute(rows, context) {
    const client = await pool.connect();

    let success = 0;

    const resultRows = [];

    try {
      await client.query("BEGIN");

      let lineNo = 10000;
      let excelRow = 2;

      for (const row of rows) {
        const item = await resolveItem(
          context.company_id,
          String(row.item_code ?? ""),
        );

        const qty = Number(row.quantity ?? 0);

        if (!item) throw new Error(`Item ${row.item_code} not found`);

        const warehouse = await resolveWarehouse(
          context.company_id,
          String(row.warehouse_code ?? ""),
        );

        if (!warehouse) {
          throw new Error(`Warehouse '${row.warehouse_code}' not found`);
        }

        const unitCost = Number(row.unit_cost ?? item.standard_cost ?? 0);

        const discountType =
          row.discount_type === "FIXED" ? "FIXED" : "PERCENT";

        const discountValue = Number(row.discount_value ?? 0);

        const vatPercent = Number(row.vat_percent ?? 0);

        const originalAmount = qty * unitCost;

        const discountAmount =
          discountType === "PERCENT"
            ? originalAmount * (discountValue / 100)
            : discountValue;

        const netAmount = originalAmount - discountAmount;

        const vatAmount = netAmount * (vatPercent / 100);

        const grossAmount = netAmount + vatAmount;

        const line: PurchaseOrderLine = {
          line_type: "ITEM",

          item_id: item.id,

          warehouse_id: warehouse?.id,

          uom_id: item.base_uom_id,

          quantity: qty,

          unit_cost: unitCost,

          description: row.description || item.name,

          discount_type: discountType,

          discount_value: discountValue,

          discount_amount: discountAmount,

          vat_percent: vatPercent,

          vat_amount: vatAmount,

          net_amount: netAmount,

          gross_amount: grossAmount,

          received_quantity: 0,
        };

        await PurchaseOrderService.insertLine(
          client,
          context.company_id,
          context.purchase_order_id!,
          line,
          lineNo,
        );

        success++;

        resultRows.push({
          row: excelRow,
          success: true,
          errors: [],
        });

        excelRow++;
        lineNo += 10000;
      }

      await PurchaseOrderService.recalculateTotals(
        client,
        context.purchase_order_id!,
      );

      await client.query("COMMIT");

      return {
        total: rows.length,
        success,
        failed: rows.length - success,
        rows: resultRows,
      };
    } catch (error) {
      await client.query("ROLLBACK");

      throw error;
    } finally {
      client.release();
    }
  },
};

/* await client.query(
          `
            INSERT INTO purchase_order_lines
            (
                company_id,
                purchase_order_id,
                item_id,
                warehouse_id,
                uom_id,

                item_code,
                item_name,
                warehouse_name,

                quantity,
                unit_cost,

                description,

                discount_type,
                discount_value,

                vat_percent,
                line_no
            )

            VALUES
            (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13, $14, $15
            )
            `,
          [
            context.company_id,
            context.purchase_order_id,

            item.id,
            warehouse?.id,

            item.base_uom_id,
            item.item_code,
            item.name,

            warehouse?.name,

            qty,
            row.unit_cost,
            row.description || item.name,
            row.discount_type || "PERCENT",
            row.discount_value || 0,
            row.vat_percent || 0,
            lineNo++,
          ],
        ); */
