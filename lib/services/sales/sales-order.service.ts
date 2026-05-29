// lib/services/sales/sales-order.service.ts

import { PoolClient } from "pg";

import { SalesOrderAddress, SalesOrderPayload } from "@/types/sales-order";

import { InventoryAllocationService } from "@/lib/services/inventory/inventory-allocation.service";
import { SalesOrderStatusService } from "./sales-order-status.service";

export class SalesOrderService {
  //  * =========================================================
  //  * CREATE SALES ORDER
  //  * =========================================================

  static async create(
    client: PoolClient,
    companyId: string,
    payload: SalesOrderPayload,
    orderNo: string,
  ) {
    this.validatePayload(payload);

    //  * =====================================================
    //  * CUSTOMER VALIDATION
    //  * =====================================================

    const customerResult = await client.query(
      `
        SELECT id, name
        FROM parties
        WHERE id = $1
        AND company_id = $2
        `,
      [payload.order.customer_id, companyId],
    );

    if (!customerResult.rows.length) {
      throw new Error("Customer not found");
    }

    //  * =====================================================
    //  * CREATE HEADER
    //  * =====================================================

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
        vat_amount,
        total_amount,
        status       
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12
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
      ],
    );

    const order = orderResult.rows[0];

    //  * =====================================================
    //  * INSERT LINES
    //  * =====================================================

    for (const line of payload.lines) {
      const qty = Number(line.quantity || 0);
      const price = Number(line.unit_price || 0);
      const discount = Number(line.discount_amount || 0);
      const tax = Number(line.vat_amount || 0);
      const lineTotal = Number(
        line.gross_amount || qty * price - discount + tax,
      );

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
          quantity_reserved,
          quantity_shipped,
          quantity_invoiced,
          unit_price,
          discount_amount,
          vat_amount,
          line_amount,
          line_type,
          vat_percent,
          gl_account_id
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6,
          $7,
          $8, $9, $10, $11,
          $12,
          $13, $14, $15, $16, $17, $18
        )
        RETURNING *
        `,
        [
          companyId,
          order.id,
          line.sales_quote_line_id || null,
          line.line_no || 10000,
          line.line_type === "ITEM" ? line.item_id : null,
          line.description || null,
          line.line_type === "ITEM" ? line.warehouse_id : null,
          qty,
          0,
          0,
          0,
          price,
          discount,
          tax,
          lineTotal,
          line.line_type,
          line.vat_percent,
          line.line_type === "GL_ACCOUNT" ? line.gl_account_id : null,
        ],
      );

      const insertedLine = lineResult.rows[0];

      //  * =================================================
      //  * AUTO RESERVE STOCK (Using corrected Service mapping)
      //  * =================================================

      if (
        line.line_type === "ITEM" &&
        line.item_id &&
        line.warehouse_id &&
        qty > 0
      ) {
        await InventoryAllocationService.createReservation(client, {
          companyId,
          itemId: line.item_id,
          warehouseId: line.warehouse_id,
          quantity: qty,
          referenceType: "SALES_ORDER",
          referenceId: order.id,
          lineReferenceId: insertedLine.id,
        });
      }
    }

    //  * =====================================================
    //  * BILLING ADDRESS
    //  * =====================================================

    if (payload.billing_address) {
      await this.insertAddress(
        client,
        companyId,
        order.id,
        payload.billing_address,
      );
    }

    //  * =====================================================
    //  * SHIPPING ADDRESS
    //  * =====================================================

    if (payload.shipping_address) {
      await this.insertAddress(
        client,
        companyId,
        order.id,
        payload.shipping_address,
      );
    }

    //  * =====================================================
    //  * RECALCULATE STATUS
    //  * =====================================================

    await SalesOrderStatusService.recalculate(client, order.id);

    return order;
  }

  //  * =========================================================
  //  * UPDATE SALES ORDER
  //  * =========================================================

  static async update(
    client: PoolClient,
    companyId: string,
    orderId: string,
    payload: SalesOrderPayload,
  ) {
    //  * =====================================================
    //  * LOAD ORDER
    //  * =====================================================

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

    //  * =====================================================
    //  * BLOCK CLOSED ORDERS
    //  * =====================================================

    if (
      existing.status === "SHIPPED" ||
      existing.status === "INVOICED" ||
      existing.status === "CLOSED"
    ) {
      throw new Error("Posted/closed sales order cannot be modified");
    }

    //  * =====================================================
    //  * RELEASE OLD ALLOCATIONS
    //  * =====================================================

    await InventoryAllocationService.releaseBySource(
      client,
      "SALES_ORDER",
      orderId,
    );

    //  * =====================================================
    //  * UPDATE HEADER
    //  * =====================================================

    await client.query(
      `
      UPDATE sales_orders
      SET
        customer_id = $1,
        requested_delivery_date = $2,
        subtotal = $3,
        vat_amount = $4,
        total_amount = $5,
        updated_at = now()
      WHERE id = $6
      `,
      [
        payload.order.customer_id,
        payload.order.requested_delivery_date || null,
        payload.order.subtotal || 0,
        payload.order.tax_amount || 0,
        payload.order.total_amount || 0,
        orderId,
      ],
    );

    //  * =====================================================
    //  * DELETE OLD LINES
    //  * =====================================================

    await client.query(
      `
      DELETE FROM sales_order_lines
      WHERE sales_order_id = $1
      `,
      [orderId],
    );

    //  * =====================================================
    //  * RECREATE LINES
    //  * =====================================================

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
          quantity_reserved,
          quantity_shipped,
          quantity_invoiced,
          unit_price,
          discount_amount,
          vat_amount,
          line_amount,
          line_type,
          vat_percent,
          gl_account_id
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *
        `,
        [
          companyId,
          orderId,
          line.line_no || 10000,
          line.line_type === "ITEM" ? line.item_id : null,
          line.description || null,
          line.line_type === "ITEM" ? line.warehouse_id : null,
          qty,
          0,
          0,
          0,
          price,
          discount,
          tax,
          lineTotal,
          line.line_type,
          line.vat_percent,
          line.line_type === "GL_ACCOUNT" ? line.gl_account_id : null,
        ],
      );

      const insertedLine = lineResult.rows[0];

      //  * =================================================
      //  * AUTO REALLOCATE STOCK
      //  * =================================================

      if (
        line.line_type === "ITEM" &&
        line.item_id &&
        line.warehouse_id &&
        qty > 0
      ) {
        await InventoryAllocationService.createReservation(client, {
          companyId,
          itemId: line.item_id,
          warehouseId: line.warehouse_id,
          quantity: qty,
          referenceType: "SALES_ORDER",
          referenceId: orderId,
          lineReferenceId: insertedLine.id,
        });
      }
    }

    //  * =====================================================
    //  * RECALCULATE STATUS
    //  * =====================================================

    await SalesOrderStatusService.recalculate(client, orderId);
  }

  //  * =========================================================
  //  * CANCEL SALES ORDER
  //  * =========================================================

  static async cancel(client: PoolClient, orderId: string) {
    await SalesOrderStatusService.cancel(client, orderId);
  }

  // static async cancel(client: PoolClient, orderId: string) {
  //   //  * RELEASE STOCK

  //   await InventoryAllocationService.releaseBySource(
  //     client,
  //     "SALES_ORDER",
  //     orderId,
  //   );

  //   await client.query(
  //     `
  //     UPDATE sales_orders
  //     SET
  //       status = 'CANCELLED',
  //       updated_at = now()
  //     WHERE id = $1
  //     `,
  //     [orderId],
  //   );
  // }

  //  * =====================================================
  //  * DELETE SALES ORDER
  //  * =====================================================

  static async delete(client: PoolClient, companyId: string, orderId: string) {
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

    //  * -----------------------------------------------------
    //  * BLOCK DELETE IF SHIPPED / INVOICED
    //  * -----------------------------------------------------

    if (
      order.status === "SHIPPED" ||
      order.status === "INVOICED" ||
      order.status === "CLOSED"
    ) {
      throw new Error("Cannot delete shipped or invoiced sales order");
    }

    //  * -----------------------------------------------------
    //  * RELEASE INVENTORY ALLOCATIONS
    //  * -----------------------------------------------------

    await InventoryAllocationService.releaseBySource(
      client,
      "SALES_ORDER",
      orderId,
    );

    //  * -----------------------------------------------------
    //  * DELETE ADDRESSES, LINES, HEADER
    //  * -----------------------------------------------------

    await client.query(
      `DELETE FROM sales_order_addresses WHERE sales_order_id = $1`,
      [orderId],
    );
    await client.query(
      `DELETE FROM sales_order_lines WHERE sales_order_id = $1`,
      [orderId],
    );
    await client.query(`DELETE FROM sales_orders WHERE id = $1`, [orderId]);
  }

  //  * =========================================================
  //  * INSERT ADDRESS
  //  * =========================================================

  private static async insertAddress(
    client: PoolClient,
    companyId: string,
    salesOrderId: string,
    address: SalesOrderAddress,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO sales_order_addresses (
        company_id, sales_order_id, address_type, contact_name, company_name,
        phone, email, address_1, address_2, city, state, postcode, country
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      `,
      [
        companyId,
        salesOrderId,
        address.address_type,
        address.contact_name || null,
        address.company_name || null,
        address.phone || null,
        address.email || null,
        address.address_1 || null,
        address.address_2 || null,
        address.city || null,
        address.state || null,
        address.postcode || null,
        address.country || null,
      ],
    );
  }

  //  * =========================================================
  //  * VALIDATION
  //  * =========================================================

  private static validatePayload(payload: SalesOrderPayload): void {
    const order = payload.order;

    if (!order.customer_id) throw new Error("Customer is required");
    if (!order.order_date) throw new Error("Order date is required");
    if (!payload.lines || !payload.lines.length)
      throw new Error("At least one line is required");

    payload.lines.forEach((line, index) => {
      const row = index + 1;
      if (!line.line_type)
        throw new Error(`Line ${row}: line type is required`);

      switch (line.line_type) {
        case "ITEM":
          if (!line.item_id) throw new Error(`Line ${row}: item is required`);
          if (!line.warehouse_id)
            throw new Error(`Line ${row}: warehouse is required`);
          if (Number(line.quantity || 0) <= 0)
            throw new Error(`Line ${row}: quantity must be greater than zero`);
          break;
        case "GL_ACCOUNT":
          if (!line.gl_account_id)
            throw new Error(`Line ${row}: GL account is required`);
          break;
        case "COMMENT":
          break;
        default:
          throw new Error(`Line ${row}: invalid line type`);
      }
    });

    if (!payload.billing_address)
      throw new Error("Billing address is required");
    if (!payload.shipping_address)
      throw new Error("Shipping address is required");
  }
}
