// lib/services/sales/sales-order-status.service.ts

import { PoolClient } from "pg";

export type SalesOrderStatus =
  | "OPEN"
  | "PARTIAL"
  | "RELEASED"
  | "DISPATCHED"
  | "INVOICED"
  | "CLOSED"
  | "CANCELLED";

export class SalesOrderStatusService {
  /**
   * =========================================================
   * RECALCULATE SALES ORDER STATUS
   * =========================================================
   */
  static async recalculate(
    client: PoolClient,
    salesOrderId: string,
  ): Promise<SalesOrderStatus> {
    /**
     * -------------------------------------------------------
     * LOAD ORDER
     * -------------------------------------------------------
     */
    const orderResult = await client.query<{
      id: string;
      status: SalesOrderStatus;
    }>(
      `
      SELECT
        id,
        status
      FROM sales_orders
      WHERE id = $1
      `,
      [salesOrderId],
    );

    if (!orderResult.rows.length) {
      throw new Error("Sales order not found");
    }

    const order = orderResult.rows[0];

    /**
     * -------------------------------------------------------
     * CANCELLED ORDERS SHOULD NOT RECALCULATE
     * -------------------------------------------------------
     */
    if (order.status === "CANCELLED") {
      return "CANCELLED";
    }

    /**
     * -------------------------------------------------------
     * LOAD LINE PROGRESS
     * -------------------------------------------------------
     */
    const linesResult = await client.query<{
      quantity: string | number | null;

      quantity_reserved: string | number | null;

      quantity_shipped: string | number | null;

      quantity_invoiced: string | number | null;

      line_type: "ITEM" | "GL_ACCOUNT" | "COMMENT";
    }>(
      `
      SELECT
        quantity,
        quantity_reserved,
        quantity_shipped,
        quantity_invoiced,
        line_type
      FROM sales_order_lines
      WHERE sales_order_id = $1
      `,
      [salesOrderId],
    );

    /**
     * -------------------------------------------------------
     * FILTER ITEM LINES ONLY
     * -------------------------------------------------------
     */
    const itemLines = linesResult.rows.filter(
      (line) => line.line_type === "ITEM",
    );

    /**
     * -------------------------------------------------------
     * NO ITEM LINES
     * -------------------------------------------------------
     */
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

      return "OPEN";
    }

    /**
     * -------------------------------------------------------
     * TOTALS
     * -------------------------------------------------------
     */
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

    /**
     * -------------------------------------------------------
     * DETERMINE STATUS
     * -------------------------------------------------------
     */
    let status: SalesOrderStatus = "OPEN";

    /**
     * FULLY INVOICED
     */
    if (totalInvoiced >= totalQty && totalQty > 0) {
      status = "INVOICED";
    }

    /**
     * FULLY DISPATCHED
     */
    else if (totalDispatched >= totalQty && totalQty > 0) {
      status = "DISPATCHED";
    }

    /**
     * STOCK RESERVED / RELEASED
     */
    else if (totalReserved >= totalQty && totalQty > 0) {
      status = "RELEASED";
    }

    /**
     * PARTIAL ACTIVITY
     */
    else if (
      totalReserved > 0 ||
      totalDispatched > 0 ||
      totalInvoiced > 0
    ) {
      status = "PARTIAL";
    }

    /**
     * -------------------------------------------------------
     * AUTO CLOSE CHECK
     * -------------------------------------------------------
     */
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

    const uninvoicedCount = Number(
      closeResult.rows[0]?.uninvoiced_count || 0,
    );

    if (uninvoicedCount === 0 && totalQty > 0) {
      status = "CLOSED";
    }

    /**
     * -------------------------------------------------------
     * UPDATE ORDER
     * -------------------------------------------------------
     */
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

  /**
   * =========================================================
   * VALIDATE SALES ORDER STATUS
   * =========================================================
   */
  static validateTransition(
    current: SalesOrderStatus,
    next: SalesOrderStatus,
  ) {
    /**
     * -------------------------------------------------------
     * CANCELLED
     * -------------------------------------------------------
     */
    if (current === "CANCELLED") {
      throw new Error(
        "Cancelled sales order cannot be modified",
      );
    }

    /**
     * -------------------------------------------------------
     * CLOSED
     * -------------------------------------------------------
     */
    if (
      current === "CLOSED" &&
      next !== "CLOSED"
    ) {
      throw new Error(
        "Closed sales order cannot be reopened",
      );
    }

    /**
     * -------------------------------------------------------
     * INVOICED
     * -------------------------------------------------------
     */
    if (
      current === "INVOICED" &&
      next === "OPEN"
    ) {
      throw new Error(
        "Invoiced sales order cannot return to OPEN",
      );
    }
  }

  /**
   * =========================================================
   * CANCEL SALES ORDER
   * =========================================================
   */
  static async cancel(
    client: PoolClient,
    salesOrderId: string,
  ): Promise<void> {
    /**
     * -------------------------------------------------------
     * CHECK DISPATCHED
     * -------------------------------------------------------
     */
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

    const dispatchedQty = Number(
      dispatchResult.rows[0]?.dispatched_qty || 0,
    );

    if (dispatchedQty > 0) {
      throw new Error(
        "Cannot cancel dispatched sales order",
      );
    }

    /**
     * -------------------------------------------------------
     * RELEASE STOCK RESERVATIONS
     * -------------------------------------------------------
     */
    await client.query(
      `
      UPDATE inventory_stock
      SET
        quantity_reserved =
          GREATEST(
            0,
            COALESCE(quantity_reserved,0)
            - COALESCE(sol.quantity_reserved,0)
          )
      FROM sales_order_lines sol
      WHERE sol.sales_order_id = $1
      AND sol.item_id = inventory_stock.item_id
      AND sol.warehouse_id = inventory_stock.warehouse_id
      `,
      [salesOrderId],
    );

    /**
     * -------------------------------------------------------
     * RESET LINE RESERVATIONS
     * -------------------------------------------------------
     */
    await client.query(
      `
      UPDATE sales_order_lines
      SET
        quantity_reserved = 0
      WHERE sales_order_id = $1
      `,
      [salesOrderId],
    );

    /**
     * -------------------------------------------------------
     * UPDATE ORDER STATUS
     * -------------------------------------------------------
     */
    await client.query(
      `
      UPDATE sales_orders
      SET
        status = 'CANCELLED',
        updated_at = now()
      WHERE id = $1
      `,
      [salesOrderId],
    );
  }
}