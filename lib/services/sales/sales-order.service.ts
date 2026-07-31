// lib/services/sales/sales-order.service.ts

import { PoolClient } from "pg";
import { SalesOrderAddress, SalesOrderPayload } from "@/types/sales-order";
import { SalesOrderPayloadSchema } from "@/lib/validations/sales-order.schema";
import { InventoryAllocationService } from "@/lib/services/inventory/inventory-allocation.service";
import { SalesOrderStatusService } from "./sales-order-status.service";

export class SalesOrderService {
  /**
   * CREATE SALES ORDER
   */
  static async create(
    client: PoolClient,
    companyId: string,
    rawPayload: SalesOrderPayload,
    orderNo: string,
  ) {
    const payload = SalesOrderPayloadSchema.parse(rawPayload);

    // Validate customer exists
    const customerResult = await client.query(
      `SELECT id, name FROM parties WHERE id = $1 AND company_id = $2`,
      [payload.order.customer_id, companyId],
    );

    if (!customerResult.rows.length) {
      throw new Error("Customer not found");
    }

    const orderData = payload.order;

    // Insert Header Record
    const orderResult = await client.query(
      `
      INSERT INTO sales_orders (
        company_id, order_no, customer_id, customer_no, sales_quote_id, sales_quote_no,
        order_date, posting_date, dispatch_date, requested_delivery_date, delivery_date, due_date,
        currency_id, exchange_rate, subtotal, vat_amount, total_amount, reference,
        payable_bank, payable_bank_id, payment_terms, payment_terms_id, payment_method, payment_method_id,
        email, salesperson, cust_order_no, link_to_po, sq_no, internal_notes, notes,
        status, shipment_status, source_of_order, invoice_status, anonymous_customer,
        contact, book_in_phone, book_in_contact, book_in_email, shipment_method, shipment_method_id,
        shipping_agent, shipment_ref_no, warehouse_ref_no, cust_warehouse_ref_no, reason,
        finance_charges, insurance_charges, freight_charges, converted_by, shipment_date, delivery_time
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29, $30, $31,
        $32, $33, $34, $35, $36,
        $37, $38, $39, $40, $41, $42,
        $43, $44, $45, $46, $47,
        $48, $49, $50, $51, $52, $53
      )
      RETURNING *
      `,
      [
        companyId,
        orderNo,
        orderData.customer_id,
        orderData.customer_no || null,
        orderData.sales_quote_id || null,
        orderData.sales_quote_no || null,
        orderData.order_date,
        orderData.posting_date || null,
        orderData.dispatch_date || null,
        orderData.requested_delivery_date || null,
        orderData.delivery_date || null,
        orderData.due_date || null,
        orderData.currency_id || null,
        orderData.exchange_rate || 1,
        orderData.subtotal || 0,
        orderData.tax_amount || 0,
        orderData.total_amount || 0,
        orderData.reference || null,
        orderData.payable_bank || null,
        orderData.payable_bank_id || null,
        orderData.payment_terms || null,
        orderData.payment_terms_id || null,
        orderData.payment_method || null,
        orderData.payment_method_id || null,
        orderData.email || null,
        orderData.salesperson || null,
        orderData.cust_order_no || null,
        orderData.link_to_po || null,
        orderData.sq_no || null,
        orderData.internal_notes || null,
        orderData.notes || null,
        orderData.status || "OPEN",
        orderData.shipment_status || "PENDING",
        orderData.source_of_order || null,
        orderData.invoice_status || "UNINVOICED",
        orderData.anonymous_customer || false,
        orderData.contact || null,
        orderData.book_in_phone || null,
        orderData.book_in_contact || null,
        orderData.book_in_email || null,
        orderData.shipment_method || null,
        orderData.shipment_method_id || null,
        orderData.shipping_agent || null,
        orderData.shipment_ref_no || null,
        orderData.warehouse_ref_no || null,
        orderData.cust_warehouse_ref_no || null,
        orderData.reason || null,
        orderData.finance_charges || 0,
        orderData.insurance_charges || 0,
        orderData.freight_charges || 0,
        orderData.converted_by || null,
        orderData.shipment_date || null,
        orderData.delivery_time || null,
      ],
    );

    const order = orderResult.rows[0];

    // Insert Document Line Entries
    for (const line of payload.lines) {
      const qty = Number(line.quantity || 0);
      const price = Number(line.unit_price || 0);
      const discount = Number(line.discount_amount || 0);
      const tax = Number(line.vat_amount || 0);
      const lineTotal = Number(
        line.gross_amount || line.line_amount || qty * price - discount + tax,
      );

      const lineResult = await client.query(
        `
        INSERT INTO sales_order_lines (
          company_id, sales_order_id, sales_quote_line_id, line_no,
          item_id, description, warehouse_id, uom_id, quantity, quantity_reserved,
          quantity_shipped, quantity_invoiced, unit_price, discount_percent, discount_amount,
          vat_percent, vat_amount, line_amount, line_type, gl_account_id
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20
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
          line.line_type === "ITEM" ? line.uom_id : null,
          qty,
          0,
          0,
          0,
          price,
          line.discount_value || 0,
          discount,
          line.vat_percent || 0,
          tax,
          lineTotal,
          line.line_type,
          line.line_type === "GL_ACCOUNT" ? line.gl_account_id : null,
        ],
      );

      const insertedLine = lineResult.rows[0];

      // Reserve stock if item line entry
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

    // Insert Address Collections
    if (payload.primary_address) {
      await this.insertAddress(
        client,
        companyId,
        order.id,
        payload.primary_address,
      );
    }
    if (payload.billing_address) {
      await this.insertAddress(
        client,
        companyId,
        order.id,
        payload.billing_address,
      );
    }
    if (payload.shipping_address) {
      await this.insertAddress(
        client,
        companyId,
        order.id,
        payload.shipping_address,
      );
    }

    await SalesOrderStatusService.recalculate(client, order.id);

    return order;
  }

  /**
   * UPDATE SALES ORDER
   */
  static async update(
    client: PoolClient,
    companyId: string,
    orderId: string,
    rawPayload: SalesOrderPayload,
  ) {
    const payload = SalesOrderPayloadSchema.parse(rawPayload);

    const existingResult = await client.query(
      `SELECT * FROM sales_orders WHERE id = $1 AND company_id = $2`,
      [orderId, companyId],
    );

    if (!existingResult.rows.length) {
      throw new Error("Sales order not found");
    }

    const existing = existingResult.rows[0];

    if (
      existing.status === "SHIPPED" ||
      existing.status === "INVOICED" ||
      existing.status === "CLOSED"
    ) {
      throw new Error("Posted/closed sales order cannot be modified");
    }

    await InventoryAllocationService.releaseBySource(
      client,
      "SALES_ORDER",
      orderId,
    );

    const orderData = payload.order;

    await client.query(
      `
      UPDATE sales_orders
      SET
        customer_id = $1, customer_no = $2, sales_quote_id = $3, sales_quote_no = $4,
        order_date = $5, posting_date = $6, dispatch_date = $7, requested_delivery_date = $8,
        delivery_date = $9, due_date = $10, currency_id = $11, exchange_rate = $12,
        subtotal = $13, vat_amount = $14, total_amount = $15, reference = $16,
        payable_bank = $17, payable_bank_id = $18, payment_terms = $19, payment_terms_id = $20,
        payment_method = $21, payment_method_id = $22, email = $23, salesperson = $24,
        cust_order_no = $25, link_to_po = $26, sq_no = $27, internal_notes = $28,
        notes = $29, status = COALESCE($30, status), shipment_status = COALESCE($31, shipment_status),
        source_of_order = $32, invoice_status = COALESCE($33, invoice_status), anonymous_customer = $34,
        contact = $35, book_in_phone = $36, book_in_contact = $37, book_in_email = $38,
        shipment_method = $39, shipment_method_id = $40, shipping_agent = $41,
        shipment_ref_no = $42, warehouse_ref_no = $43, cust_warehouse_ref_no = $44, reason = $45,
        finance_charges = $46, insurance_charges = $47, freight_charges = $48,
        converted_by = $49, shipment_date = $50, delivery_time = $51, updated_at = now()
      WHERE id = $52 AND company_id = $53
      `,
      [
        orderData.customer_id,
        orderData.customer_no || null,
        orderData.sales_quote_id || null,
        orderData.sales_quote_no || null,
        orderData.order_date,
        orderData.posting_date || null,
        orderData.dispatch_date || null,
        orderData.requested_delivery_date || null,
        orderData.delivery_date || null,
        orderData.due_date || null,
        orderData.currency_id || null,
        orderData.exchange_rate || 1,
        orderData.subtotal || 0,
        orderData.tax_amount || 0,
        orderData.total_amount || 0,
        orderData.reference || null,
        orderData.payable_bank || null,
        orderData.payable_bank_id || null,
        orderData.payment_terms || null,
        orderData.payment_terms_id || null,
        orderData.payment_method || null,
        orderData.payment_method_id || null,
        orderData.email || null,
        orderData.salesperson || null,
        orderData.cust_order_no || null,
        orderData.link_to_po || null,
        orderData.sq_no || null,
        orderData.internal_notes || null,
        orderData.notes || null,
        orderData.status || null,
        orderData.shipment_status || null,
        orderData.source_of_order || null,
        orderData.invoice_status || null,
        orderData.anonymous_customer || false,
        orderData.contact || null,
        orderData.book_in_phone || null,
        orderData.book_in_contact || null,
        orderData.book_in_email || null,
        orderData.shipment_method || null,
        orderData.shipment_method_id || null,
        orderData.shipping_agent || null,
        orderData.shipment_ref_no || null,
        orderData.warehouse_ref_no || null,
        orderData.cust_warehouse_ref_no || null,
        orderData.reason || null,
        orderData.finance_charges || 0,
        orderData.insurance_charges || 0,
        orderData.freight_charges || 0,
        orderData.converted_by || null,
        orderData.shipment_date || null,
        orderData.delivery_time || null,
        orderId,
        companyId,
      ],
    );

    // Delete existing child entries
    await client.query(
      `DELETE FROM sales_order_lines WHERE sales_order_id = $1`,
      [orderId],
    );
    await client.query(
      `DELETE FROM sales_order_addresses WHERE sales_order_id = $1`,
      [orderId],
    );

    // Reinsert lines
    for (const line of payload.lines) {
      const qty = Number(line.quantity || 0);
      const price = Number(line.unit_price || 0);
      const discount = Number(line.discount_amount || 0);
      const tax = Number(line.vat_amount || 0);
      const lineTotal = qty * price - discount + tax;

      const lineResult = await client.query(
        `
        INSERT INTO sales_order_lines (
          company_id, sales_order_id, sales_quote_line_id, line_no,
          item_id, description, warehouse_id, uom_id, quantity, quantity_reserved,
          quantity_shipped, quantity_invoiced, unit_price, discount_percent, discount_amount,
          vat_percent, vat_amount, line_amount, line_type, gl_account_id
        )
        VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20
        )
        RETURNING *
        `,
        [
          companyId,
          orderId,
          line.sales_quote_line_id || null,
          line.line_no || 10000,
          line.line_type === "ITEM" ? line.item_id : null,
          line.description || null,
          line.line_type === "ITEM" ? line.warehouse_id : null,
          line.line_type === "ITEM" ? line.uom_id : null,
          qty,
          0,
          0,
          0,
          price,
          line.discount_value || 0,
          discount,
          line.vat_percent || 0,
          tax,
          lineTotal,
          line.line_type,
          line.line_type === "GL_ACCOUNT" ? line.gl_account_id : null,
        ],
      );

      const insertedLine = lineResult.rows[0];

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

    // Reinsert addresses
    if (payload.primary_address) {
      await this.insertAddress(
        client,
        companyId,
        orderId,
        payload.primary_address,
      );
    }
    if (payload.billing_address) {
      await this.insertAddress(
        client,
        companyId,
        orderId,
        payload.billing_address,
      );
    }
    if (payload.shipping_address) {
      await this.insertAddress(
        client,
        companyId,
        orderId,
        payload.shipping_address,
      );
    }

    await SalesOrderStatusService.recalculate(client, orderId);
  }

  /**
   * CANCEL SALES ORDER
   */
  static async cancel(client: PoolClient, orderId: string) {
    await SalesOrderStatusService.cancel(client, orderId);
  }

  /**
   * DELETE SALES ORDER
   */
  static async delete(client: PoolClient, companyId: string, orderId: string) {
    const orderResult = await client.query(
      `SELECT * FROM sales_orders WHERE company_id = $1 AND id = $2`,
      [companyId, orderId],
    );

    if (!orderResult.rows.length) {
      throw new Error("Sales order not found");
    }

    const order = orderResult.rows[0];

    if (
      order.status === "SHIPPED" ||
      order.status === "INVOICED" ||
      order.status === "CLOSED"
    ) {
      throw new Error("Cannot delete shipped or invoiced sales order");
    }

    await InventoryAllocationService.releaseBySource(
      client,
      "SALES_ORDER",
      orderId,
    );

    await client.query(
      `DELETE FROM sales_order_addresses WHERE sales_order_id = $1`,
      [orderId],
    );
    await client.query(
      `DELETE FROM sales_order_lines WHERE sales_order_id = $1`,
      [orderId],
    );
    await client.query(
      `DELETE FROM sales_orders WHERE id = $1 AND company_id = $2`,
      [orderId, companyId],
    );
  }

  /**
   * PRIVATE HELPER TO INSERT ADDRESS
   */
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
        address.contact_name || address.name || null,
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
}

/* import { PoolClient } from "pg";

import { SalesOrderAddress, SalesOrderPayload } from "@/types/sales-order";

import { InventoryAllocationService } from "@/lib/services/inventory/inventory-allocation.service";
import { SalesOrderStatusService } from "./sales-order-status.service";

export class SalesOrderService {

  static async create(
    client: PoolClient,
    companyId: string,
    payload: SalesOrderPayload,
    orderNo: string,
  ) {
    this.validatePayload(payload);

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
} */
