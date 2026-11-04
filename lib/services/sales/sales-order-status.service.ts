// lib/services/sales/sales-order-status.service.ts

import { PoolClient } from "pg";

export type SalesOrderStatus =
  | "draft"
  | "open"
  | "partially_shipped"
  | "shipped"
  | "invoiced"
  | "closed"
  | "cancelled"
  | "completed";

export class SalesOrderStatusService {
  static async recalculate(
    client: PoolClient,
    salesOrderId: string,
  ): Promise<SalesOrderStatus> {
    const orderResult = await client.query<{
      id: string;
      status: SalesOrderStatus;
    }>(`SELECT id, status FROM sales_orders WHERE id = $1`, [salesOrderId]);

    if (!orderResult.rows.length) {
      throw new Error("Sales order not found");
    }

    const order = orderResult.rows[0];
    if (order.status === "cancelled") {
      return "cancelled";
    }

    const linesResult = await client.query<{
      quantity: string | number | null;
      quantity_reserved: string | number | null;
      quantity_shipped: string | number | null;
      quantity_invoiced: string | number | null;
      line_type: "ITEM" | "GL_ACCOUNT" | "COMMENT";
    }>(
      `
      SELECT quantity, quantity_reserved, quantity_shipped, quantity_invoiced, line_type
      FROM sales_order_lines
      WHERE sales_order_id = $1
      `,
      [salesOrderId],
    );

    const itemLines = linesResult.rows.filter(
      (line) => line.line_type === "ITEM",
    );

    if (itemLines.length === 0) {
      await client.query(
        `
        UPDATE sales_orders
        SET
          status = 'OPEN',
          updated_at = now()
        WHERE id = $1
        `,
        [salesOrderId],
      );

      return "open";
    }

    const totalQty = itemLines.reduce(
      (sum, line) => sum + Number(line.quantity || 0),
      0,
    );

    const totalReserved = itemLines.reduce(
      (sum, line) => sum + Number(line.quantity_reserved || 0),
      0,
    );

    const totalDispatched = itemLines.reduce(
      (sum, line) => sum + Number(line.quantity_shipped || 0),
      0,
    );

    const totalInvoiced = itemLines.reduce(
      (sum, line) => sum + Number(line.quantity_invoiced || 0),
      0,
    );

    let status: SalesOrderStatus = "open";

    if (totalInvoiced >= totalQty && totalQty > 0) {
      status = "invoiced";
    } else if (totalDispatched >= totalQty && totalQty > 0) {
      status = "shipped";
    } else if (totalReserved >= totalQty && totalQty > 0) {
      status = "shipped";
    } else if (totalReserved > 0 || totalDispatched > 0 || totalInvoiced > 0) {
      status = "partially_shipped";
    }

    const closeResult = await client.query<{
      uninvoiced_count: string;
    }>(
      `
      SELECT COUNT(*)::text AS uninvoiced_count
      FROM sales_order_lines
      WHERE sales_order_id = $1
      AND line_type = 'ITEM'
      AND COALESCE(quantity_invoiced,0) < COALESCE(quantity,0)
      `,
      [salesOrderId],
    );

    const uninvoicedCount = Number(closeResult.rows[0]?.uninvoiced_count || 0);

    if (uninvoicedCount === 0 && totalQty > 0) {
      status = "closed";
    }

    await client.query(
      `
      UPDATE sales_orders
      SET
        status = $1,
        updated_at = now()
      WHERE id = $2
      `,
      [status, salesOrderId],
    );

    return status;
  }

  static validateTransition(current: SalesOrderStatus, next: SalesOrderStatus) {
    if (current === "cancelled")
      throw new Error("Cancelled sales order cannot be modified");
    if (current === "closed" && next !== "closed")
      throw new Error("Closed sales order cannot be reopened");
    if (current === "invoiced" && next === "open")
      throw new Error("Invoiced sales order cannot return to OPEN");
  }

  static async cancel(client: PoolClient, salesOrderId: string): Promise<void> {
    const dispatchResult = await client.query<{
      dispatched_qty: string;
    }>(
      `
      SELECT
        COALESCE(SUM(quantity_shipped),0)::text AS dispatched_qty
      FROM sales_order_lines
      WHERE sales_order_id = $1
      `,
      [salesOrderId],
    );

    const dispatchedQty = Number(dispatchResult.rows[0]?.dispatched_qty || 0);

    if (dispatchedQty > 0) {
      throw new Error("Cannot cancel dispatched sales order");
    }

    await client.query(
      `
      UPDATE inventory_stock
      SET
        reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - COALESCE(sol.quantity_reserved, 0)),
        updated_at = now()
      FROM sales_order_lines sol
      WHERE sol.sales_order_id = $1
      AND sol.item_id = inventory_stock.item_id
      AND sol.warehouse_id = inventory_stock.warehouse_id
      `,
      [salesOrderId],
    );

    await client.query(
      `UPDATE sales_order_lines SET quantity_reserved = 0 WHERE sales_order_id = $1`,
      [salesOrderId],
    );

    await client.query(
      `UPDATE sales_orders SET status = 'CANCELLED', updated_at = now() WHERE id = $1`,
      [salesOrderId],
    );
  }
}
