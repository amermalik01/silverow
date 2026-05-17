// lib/services/sales/sales-order.service.ts

import { PoolClient } from "pg";

import { SalesOrderPayload } from "@/types/sales-order";

import { InventoryAllocationService } from "@/lib/services/inventory/inventory-allocation.service";
import { SalesOrderStatusService } from "./sales-order-status.service";

export class SalesOrderService {
  /**
   * =========================================================
   * CREATE SALES ORDER
   * =========================================================
   */
  static async create(
    client: PoolClient,
    companyId: string,
    payload: SalesOrderPayload,
    orderNo: string,
  ) {
    /**
     * =====================================================
     * VALIDATE HEADER
     * =====================================================
     */

    if (!payload.order.customer_id) {
      throw new Error("Customer is required");
    }

    if (!payload.order.order_date) {
      throw new Error("Order date is required");
    }

    if (!payload.lines.length) {
      throw new Error("At least one line is required");
    }

    /**
     * =====================================================
     * VALIDATE LINES
     * =====================================================
     */

    for (const [index, line] of payload.lines.entries()) {
      const row = index + 1;

      if (!line.item_id) {
        throw new Error(`Line ${row}: Item is required`);
      }

      if (!line.warehouse_id) {
        throw new Error(`Line ${row}: Warehouse is required`);
      }

      if (Number(line.quantity || 0) <= 0) {
        throw new Error(`Line ${row}: Quantity must be greater than 0`);
      }

      if (Number(line.unit_price || 0) < 0) {
        throw new Error(`Line ${row}: Unit price cannot be negative`);
      }
    }

    /**
     * =====================================================
     * CREATE HEADER
     * =====================================================
     */

    const orderResult = await client.query(
      `
      INSERT INTO sales_orders (
        company_id,
        order_no,
        customer_id,
        sales_quote_id,
        order_date,
        requested_delivery_date,
        currency_id,
        exchange_rate,
        subtotal,
        tax_amount,
        total_amount,
        status,
        notes
      )
      VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,$9,$10,
        $11,$12,$13
      )
      RETURNING *
      `,
      [
        companyId,
        orderNo,
        payload.order.customer_id,
        payload.order.sales_quote_id || null,
        payload.order.order_date,
        payload.order.requested_delivery_date || null,
        payload.order.currency_id || null,
        payload.order.exchange_rate || 1,
        payload.order.subtotal || 0,
        payload.order.tax_amount || 0,
        payload.order.total_amount || 0,
        "OPEN",
        payload.order.notes || null,
      ],
    );

    const order = orderResult.rows[0];

    /**
     * =====================================================
     * CREATE LINES
     * =====================================================
     */

    for (const line of payload.lines) {
      /**
       * ---------------------------------------------------
       * CALCULATE LINE TOTAL
       * ---------------------------------------------------
       */

      const qty = Number(line.quantity || 0);

      const price = Number(line.unit_price || 0);

      const discount = Number(line.discount_amount || 0);

      const tax = Number(line.vat_amount || 0);

      const lineTotal = qty * price - discount + tax;

      /**
       * ---------------------------------------------------
       * INSERT LINE
       * ---------------------------------------------------
       */

      const lineResult = await client.query(
        `
        INSERT INTO sales_order_lines (
          company_id,
          sales_order_id,
          sales_quote_line_id,
          line_no,

          item_id,
          description,

          warehouse_id,

          quantity,
          reserved_quantity,
          shipped_quantity,
          invoiced_quantity,

          unit_price,

          discount_amount,
          tax_amount,
          line_total
        )
        VALUES (
          $1,$2,$3,$4,
          $5,$6,
          $7,
          $8,$9,$10,$11,
          $12,
          $13,$14,$15
        )
        RETURNING *
        `,
        [
          companyId,
          order.id,
          line.sales_quote_line_id || null,
          line.line_no || 10000,

          line.item_id,
          line.description || null,

          line.warehouse_id,

          qty,
          0,
          0,
          0,

          price,

          discount,
          tax,
          lineTotal,
        ],
      );

      const insertedLine = lineResult.rows[0];

      /**
       * =================================================
       * STOCK AVAILABILITY VALIDATION
       * =================================================
       */

      const stockResult = await client.query(
        `
        SELECT
          COALESCE(quantity_on_hand,0) AS quantity_on_hand,
          COALESCE(quantity_reserved,0) AS quantity_reserved
        FROM inventory_stock
        WHERE
          company_id = $1
          AND warehouse_id = $2
          AND item_id = $3
        `,
        [companyId, line.warehouse_id, line.item_id],
      );

      const stock = stockResult.rows[0];

      const onHand = Number(stock?.quantity_on_hand || 0);

      const reserved = Number(stock?.quantity_reserved || 0);

      const available = onHand - reserved;

      /**
       * =================================================
       * AUTO RESERVE STOCK
       * =================================================
       */

      let reserveQty = 0;

      if (available > 0) {
        reserveQty = Math.min(available, qty);

        /**
         * -----------------------------------------------
         * CREATE INVENTORY ALLOCATION
         * -----------------------------------------------
         */

        if (line.line_type === "ITEM" && line.item_id && line.warehouse_id) {
          await InventoryAllocationService.allocate({
            client,

            company_id: companyId,

            source_type: "SALES_ORDER",

            source_id: order.id,

            source_line_id: insertedLine.id,

            warehouse_id: line.warehouse_id,

            item_id: line.item_id,

            quantity: qty,
          });
        }

        /**
         * -----------------------------------------------
         * UPDATE RESERVED QTY
         * -----------------------------------------------
         */

        await client.query(
          `
          UPDATE sales_order_lines
          SET reserved_quantity = $1
          WHERE id = $2
          `,
          [reserveQty, insertedLine.id],
        );
      }
    }

    /**
     * =====================================================
     * RECALCULATE STATUS
     * =====================================================
     */

    await SalesOrderStatusService.recalculate(client, order.id);

    return order;
  }

  /**
   * =========================================================
   * UPDATE SALES ORDER
   * =========================================================
   */
  static async update(
    client: PoolClient,
    companyId: string,
    orderId: string,
    payload: SalesOrderPayload,
  ) {
    /**
     * =====================================================
     * LOAD ORDER
     * =====================================================
     */

    const existingResult = await client.query(
      `
      SELECT *
      FROM sales_orders
      WHERE id = $1
      `,
      [orderId],
    );

    if (!existingResult.rows.length) {
      throw new Error("Sales order not found");
    }

    const existing = existingResult.rows[0];

    /**
     * =====================================================
     * BLOCK CLOSED ORDERS
     * =====================================================
     */

    if (
      existing.status === "SHIPPED" ||
      existing.status === "INVOICED" ||
      existing.status === "CLOSED"
    ) {
      throw new Error("Posted/closed sales order cannot be modified");
    }

    /**
     * =====================================================
     * RELEASE OLD ALLOCATIONS
     * =====================================================
     */

    await InventoryAllocationService.releaseBySource(
      client,
      "SALES_ORDER",
      orderId,
    );

    /**
     * =====================================================
     * UPDATE HEADER
     * =====================================================
     */

    await client.query(
      `
      UPDATE sales_orders
      SET
        customer_id = $1,
        requested_delivery_date = $2,

        subtotal = $3,
        tax_amount = $4,
        total_amount = $5,

        notes = $6,

        updated_at = now()

      WHERE id = $7
      `,
      [
        payload.order.customer_id,
        payload.order.requested_delivery_date || null,

        payload.order.subtotal || 0,
        payload.order.tax_amount || 0,
        payload.order.total_amount || 0,

        payload.order.notes || null,

        orderId,
      ],
    );

    /**
     * =====================================================
     * DELETE OLD LINES
     * =====================================================
     */

    await client.query(
      `
      DELETE FROM sales_order_lines
      WHERE sales_order_id = $1
      `,
      [orderId],
    );

    /**
     * =====================================================
     * RECREATE LINES
     * =====================================================
     */

    for (const line of payload.lines) {
      const qty = Number(line.quantity || 0);

      const price = Number(line.unit_price || 0);

      const discount = Number(line.discount_amount || 0);

      const tax = Number(line.vat_amount || 0);

      const lineTotal = qty * price - discount + tax;

      const lineResult = await client.query(
        `
        INSERT INTO sales_order_lines (
          company_id,
          sales_order_id,
          line_no,

          item_id,
          description,
          warehouse_id,

          quantity,
          reserved_quantity,
          shipped_quantity,
          invoiced_quantity,

          unit_price,

          discount_amount,
          tax_amount,
          line_total
        )
        VALUES (
          $1,$2,$3,
          $4,$5,$6,
          $7,$8,$9,$10,
          $11,
          $12,$13,$14
        )
        RETURNING *
        `,
        [
          companyId,
          orderId,
          line.line_no || 10000,

          line.item_id,
          line.description || null,
          line.warehouse_id,

          qty,
          0,
          0,
          0,

          price,

          discount,
          tax,
          lineTotal,
        ],
      );

      const insertedLine = lineResult.rows[0];

      /**
       * =================================================
       * AUTO REALLOCATE STOCK
       * =================================================
       */

      if (line.line_type === "ITEM" && line.item_id && line.warehouse_id) {
        await InventoryAllocationService.allocate({
          client,

          company_id: companyId,

          source_type: "SALES_ORDER",

          source_id: orderId,

          source_line_id: insertedLine.id,

          warehouse_id: line.warehouse_id,

          item_id: line.item_id,

          quantity: qty,
        });
      }

      await client.query(
        `
        UPDATE sales_order_lines
        SET reserved_quantity = $1
        WHERE id = $2
        `,
        [qty, insertedLine.id],
      );
    }

    /**
     * =====================================================
     * RECALCULATE STATUS
     * =====================================================
     */

    await SalesOrderStatusService.recalculate(client, orderId);
  }

  /**
   * =========================================================
   * CANCEL SALES ORDER
   * =========================================================
   */
  static async cancel(client: PoolClient, orderId: string) {
    /**
     * RELEASE STOCK
     */

    await InventoryAllocationService.releaseBySource(
      client,
      "SALES_ORDER",
      orderId,
    );

    /**
     * UPDATE STATUS
     */

    await client.query(
      `
      UPDATE sales_orders
      SET
        status = 'CANCELLED',
        updated_at = now()
      WHERE id = $1
      `,
      [orderId],
    );
  }

  /**
   * =====================================================
   * DELETE SALES ORDER
   * =====================================================
   */
  static async delete(client: PoolClient, companyId: string, orderId: string) {
    /**
     * -----------------------------------------------------
     * LOAD ORDER
     * -----------------------------------------------------
     */
    const orderResult = await client.query(
      `
        SELECT *
        FROM sales_orders
        WHERE company_id = $1
        AND id = $2
        `,
      [companyId, orderId],
    );

    if (!orderResult.rows.length) {
      throw new Error("Sales order not found");
    }

    const order = orderResult.rows[0];

    /**
     * -----------------------------------------------------
     * BLOCK DELETE IF SHIPPED / INVOICED
     * -----------------------------------------------------
     */
    if (
      order.status === "SHIPPED" ||
      order.status === "INVOICED" ||
      order.status === "CLOSED"
    ) {
      throw new Error("Cannot delete shipped or invoiced sales order");
    }

    /**
     * -----------------------------------------------------
     * RELEASE INVENTORY ALLOCATIONS
     * -----------------------------------------------------
     */
    await InventoryAllocationService.releaseBySource(
      client,
      "SALES_ORDER",
      orderId,
    );

    /**
     * -----------------------------------------------------
     * DELETE ADDRESSES
     * -----------------------------------------------------
     */
    await client.query(
      `
        DELETE FROM sales_order_addresses
        WHERE sales_order_id = $1
        `,
      [orderId],
    );

    /**
     * -----------------------------------------------------
     * DELETE LINES
     * -----------------------------------------------------
     */
    await client.query(
      `
        DELETE FROM sales_order_lines
        WHERE sales_order_id = $1
        `,
      [orderId],
    );

    /**
     * -----------------------------------------------------
     * DELETE HEADER
     * -----------------------------------------------------
     */
    await client.query(
      `
        DELETE FROM sales_orders
        WHERE id = $1
        `,
      [orderId],
    );
  }
}
