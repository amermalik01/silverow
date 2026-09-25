// lib/services/sales/stock-allocation.service.ts

import { pool } from "@/lib/db";
import { PoolClient } from "pg";
import { GLPostingService } from "@/lib/services/gl/gl-posting.service";
import { AccountResolutionService } from "@/lib/services/gl/account-resolution.service";
import { GLValidationService } from "@/lib/services/gl/gl-validation.service";
import { JournalLineInput } from "@/types/journal";
import { UnifiedInventoryEngineService } from "@/lib/services/inventory/unified-inventory-engine.service";
import { StockAllocationPayload } from "@/types/sales-order";

export class StockAllocationService {
  /**
   * Standalone dispatch entry point
   */
  static async create(companyId: string, payload: StockAllocationPayload) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const dispatch = await this.createTransactional(
        client,
        companyId,
        payload
      );
      await client.query("COMMIT");
      return dispatch;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Transactional creation engine
   */
  static async createTransactional(
    client: PoolClient,
    companyId: string,
    payload: StockAllocationPayload
  ) {
    // 1. Generate Dispatch Sequence Number
    const dispatchNoRes = await client.query(
      `SELECT 'DSP-' || LPAD(NEXTVAL('stock_dispatch_no_seq')::text, 6, '0') AS dispatch_no`
    );
    const dispatchNo =
      payload.dispatch.dispatch_no || dispatchNoRes.rows[0]?.dispatch_no;

    // 2. Insert into unified stock_dispatches table
    const dispatchResult = await client.query(
      `
      INSERT INTO stock_dispatches (
        company_id,
        dispatch_no,
        sales_order_id,
        customer_id,
        warehouse_id,
        dispatch_date,
        posting_date,
        reference_no,
        notes,
        status,
        is_posted,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPEN', false, $10)
      RETURNING *
      `,
      [
        companyId,
        dispatchNo,
        payload.dispatch.sales_order_id || null,
        payload.dispatch.customer_id || null,
        payload.dispatch.warehouse_id || null,
        payload.dispatch.dispatch_date,
        payload.dispatch.posting_date,
        payload.dispatch.reference_no || null,
        payload.dispatch.notes || null,
        payload.dispatch.userId || null,
      ]
    );

    const dispatch = dispatchResult.rows[0];
    const currencyId = payload.dispatch.currency_id;
    const exchangeRate = payload.dispatch.exchange_rate;
    const userId = payload.dispatch.userId;

    const glLines: JournalLineInput[] = [];

    // Check inventory accounting system
    const companyRes = await client.query(
      `SELECT inventory_system FROM companies WHERE id = $1`,
      [companyId]
    );
    const inventorySystem = companyRes.rows[0]?.inventory_system || "PERIODIC";

    for (const line of payload.lines) {
      if (line.item_id && !line.warehouse_id) {
        throw new Error(
          `Warehouse identification is required for item ${line.item_id}`
        );
      }

      const qtyShipped = Number(line.quantity);
      if (qtyShipped <= 0) {
        throw new Error("Dispatch quantity must be greater than zero");
      }

      // 3. Validate against Sales Order line open quantities
      if (line.sales_order_line_id) {
        const soLineResult = await client.query(
          `
          SELECT quantity, quantity_shipped 
          FROM sales_order_lines 
          WHERE id = $1 FOR UPDATE
          `,
          [line.sales_order_line_id]
        );

        if (!soLineResult.rows.length) {
          throw new Error(
            `Sales Order line ${line.sales_order_line_id} not found`
          );
        }

        const soLine = soLineResult.rows[0];
        const remainingAllowed =
          Number(soLine.quantity) - Number(soLine.quantity_shipped || 0);

        if (qtyShipped > Number(remainingAllowed.toFixed(6))) {
          throw new Error(
            `Dispatch quantity (${qtyShipped}) exceeds remaining open line quantity (${remainingAllowed})`
          );
        }
      }

      const unitPrice = Number(line.unit_price || 0);
      const lineTotalAmount = Number((qtyShipped * unitPrice).toFixed(2));

      // 4. Save into unified stock_dispatch_lines table
      const lineResult = await client.query(
        `
        INSERT INTO stock_dispatch_lines (
          company_id, stock_dispatch_id, sales_order_line_id,
          line_no, item_id, warehouse_id, location_id, bin_code,
          batch_no, serial_no, expiry_date,
          quantity, unit_cost, total_cost
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
        `,
        [
          companyId,
          dispatch.id,
          line.sales_order_line_id || null,
          line.line_no,
          line.item_id,
          line.warehouse_id,
          line.location_id || null,
          line.bin_code || null,
          line.batch_no || null,
          line.serial_no || null,
          line.expiry_date || null,
          qtyShipped,
          unitPrice,
          lineTotalAmount,
        ]
      );

      const dispatchLine = lineResult.rows[0];

      // 5. Deduct Outbound Inventory from stock layers
      let actualCostDeducted = 0;
      let outboundUnitCost = 0;

      if (line.item_id && line.warehouse_id) {
        const outboundRes =
          await UnifiedInventoryEngineService.processOutboundStock(
            client,
            companyId,
            dispatch.posting_date,
            "SALES_SHIPMENT",
            {
              item_id: line.item_id,
              warehouse_id: line.warehouse_id,
              location_id: line.location_id,
              bin_code: line.bin_code,
              batch_no: line.batch_no,
              serial_no: line.serial_no,
              expiry_date: line.expiry_date,
              quantity: qtyShipped,
              unit_cost: line.unit_cost || 0,
              reference_type: "SALES_SHIPMENT",
              reference_id: dispatch.id,
              reference_line_id: dispatchLine.id,
            }
          );

        actualCostDeducted = Number(outboundRes.totalCost);
        outboundUnitCost = Number(outboundRes.unitCost);
      }

      // 6. Update Sales Order Line Shipped Quantities
      if (line.sales_order_line_id) {
        await client.query(
          `
          UPDATE sales_order_lines 
          SET quantity_shipped = COALESCE(quantity_shipped, 0) + $1, 
              updated_at = NOW()
          WHERE id = $2
          `,
          [qtyShipped, line.sales_order_line_id]
        );
      }

      // 7. Generate GL Journal Lines (Perpetual Inventory Mode)
      if (inventorySystem === "PERPETUAL") {
        const accounts = await AccountResolutionService.resolveSalesAccounts(
          client,
          companyId,
          line.item_id
        );

        // DR - Cost of Goods Sold (COGS)
        glLines.push({
          account_id: accounts.cogs_account_id,
          debit: actualCostDeducted,
          credit: 0,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyShipped,
          unit_cost: outboundUnitCost,
          reference_type: "SALES_SHIPMENT",
          reference_id: dispatch.id,
          description: `COGS entry for dispatched item ${line.item_id}`,
        });

        // CR - Inventory Asset Account
        glLines.push({
          account_id: accounts.inventory_account_id,
          debit: 0,
          credit: actualCostDeducted,
          item_id: line.item_id,
          warehouse_id: line.warehouse_id,
          quantity: qtyShipped,
          unit_cost: outboundUnitCost,
          reference_type: "SALES_SHIPMENT",
          reference_id: dispatch.id,
          description: `Inventory reduction for dispatched item ${line.item_id}`,
        });
      }
    }

    // 8. Post GL Journal Entry
    if (glLines.length > 0) {
      GLValidationService.validateBalanced(glLines);

      await GLPostingService.postJournal(client, {
        company_id: companyId,
        entry_date: dispatch.posting_date,
        source: "SALES",
        journal_type: "SALES_SHIPMENT",
        reference: dispatch.dispatch_no,
        source_id: dispatch.id,
        description: `Posted sales dispatch document: ${dispatch.dispatch_no}`,

        currency_id: currencyId,
        exchange_rate: exchangeRate,
        created_by: userId || null,
        lines: glLines,
      });
    }

    // 9. Mark Dispatch Document Posted in stock_dispatches
    await client.query(
      `
      UPDATE stock_dispatches 
      SET is_posted = true, posted_at = NOW(), status = 'POSTED'
      WHERE id = $1
      `,
      [dispatch.id]
    );

    // 10. Sync Parent Sales Order Status Pipeline
    if (payload.dispatch.sales_order_id) {
      await client.query(
        `
        UPDATE sales_orders so
        SET status = CASE 
          WHEN NOT EXISTS (
            SELECT 1 FROM sales_order_lines sol
            WHERE sol.sales_order_id = so.id
              AND COALESCE(sol.quantity_shipped, 0) < COALESCE(sol.quantity, 0)
              AND COALESCE(sol.is_deleted, false) = false
          ) THEN 'shipped'::sales_order_status_enum
          ELSE 'partially_shipped'::sales_order_status_enum
        END,
        updated_at = NOW()
        WHERE so.id = $1
        `,
        [payload.dispatch.sales_order_id]
      );
    }

    return dispatch;
  }
}

