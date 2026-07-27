// lib/services/purchase-orders/purchase-order.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseOrderPayloadSchema } from "@/lib/validations/purchase-order.schema";
import {
  PurchaseOrder,
  PurchaseOrderAddress,
  PurchaseOrderLine,
  PurchaseOrderPayload,
} from "@/types/purchase-order";
import { StockAllocationRecord } from "@/app/components/shared/modals/StockAllocationModal";

export class PurchaseOrderService {
  static async list(companyId: string): Promise<PurchaseOrder[]> {
    const result = await pool.query(
      `
      SELECT po.*, p.name AS supplier_name
      FROM purchase_orders po
      LEFT JOIN parties p ON p.id = po.supplier_id
      WHERE po.company_id = $1
      ORDER BY po.created_at DESC
      `,
      [companyId],
    );
    return result.rows;
  }

  static async get(companyId: string, id: string) {
    const orderResult = await pool.query(
      `
      SELECT po.*, 
        p.name AS supplier_name,
        pt.name AS payment_terms,
        pm.name AS payment_method,
        sm.name AS shipment_method

      FROM purchase_orders po

      LEFT JOIN parties p ON p.id = po.supplier_id

      LEFT JOIN payment_terms pt ON pt.id=po.payment_terms_id

      LEFT JOIN payment_methods pm ON pm.id=po.payment_method_id

      LEFT JOIN shipment_methods sm ON sm.id=po.shipment_method_id

      WHERE po.id = $1 AND po.company_id = $2
      `,
      [id, companyId],
    );

    if (!orderResult.rows.length) return null;

    // Fetch PO Lines with standard UI components metadata
    const linesResult = await pool.query(
      `
      SELECT 
        pol.*, 
        (pol.quantity - COALESCE(pol.received_quantity, 0)) AS remaining_quantity,
        
        i.item_code,
        i.name AS item_name,        

        gl.code AS account_code,
        gl.name AS account_name,        

        w.code AS warehouse_code,
        w.name AS warehouse_name,

        pol.warehouse_location_id AS location_id,
        wl.code AS location_code,
        wl.title AS location_name,

        u.name AS uom_name

      FROM purchase_order_lines pol
      LEFT JOIN items i ON pol.item_id = i.id AND i.company_id = $2
      LEFT JOIN chart_of_accounts gl ON pol.gl_account_id = gl.id AND gl.company_id = $2
      LEFT JOIN warehouses w ON pol.warehouse_id = w.id AND w.company_id = $2
      LEFT JOIN warehouse_locations wl ON pol.warehouse_id = wl.warehouse_id AND pol.warehouse_location_id = wl.id AND w.company_id = $2
      LEFT JOIN uoms u ON pol.uom_id = u.id AND u.company_id = $2

      WHERE pol.purchase_order_id = $1 AND pol.is_deleted = false
      ORDER BY pol.line_no
      `,
      [id, companyId],
    );

    // 🌟 FIX: Join with purchase_order_lines to look up by PO ID and select correct columns
    const allocationsResult = await pool.query(
      `
      SELECT 
        ia.id,
        ia.purchase_order_line_id,
        ia.item_id,
        ia.warehouse_id,
        ia.allocated_quantity AS quantity,
        ia.batch_no,
        ia.bin_code,
        TO_CHAR(ia.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        TO_CHAR(ia.created_at, 'YYYY-MM-DD') AS date_received
      FROM inventory_allocations ia
      INNER JOIN purchase_order_lines pol ON ia.purchase_order_line_id = pol.id
      WHERE pol.purchase_order_id = $1 AND ia.company_id = $2
      `,
      [id, companyId],
    );

    // Map the accurate database properties to your frontend modal structures safely
    const linesWithAllocations = linesResult.rows.map((line) => {
      const lineAllocations = allocationsResult.rows
        .filter((alloc) => alloc.purchase_order_line_id === line.id)
        .map((alloc) => ({
          date_received: alloc.date_received || "",
          prod_date: "", // Set to blank string since it is not saved on this table
          expiry_date: alloc.expiry_date || "",
          batch_no: alloc.batch_no || "",
          bin_code: alloc.bin_code || "",
          quantity: Number(alloc.quantity) || 0,
        }));

      return {
        ...line,
        allocations: lineAllocations,
        initialAllocations: lineAllocations,
        is_allocated:
          lineAllocations.length > 0 &&
          lineAllocations.reduce((sum, a) => sum + a.quantity, 0) ===
            Number(line.quantity),
      };
    });

    const addressResult = await pool.query(
      `SELECT
          id,
          address_type,
          name,
          attention,
          contact_name,
          contact_person,
          phone,
          email,
          address_1,
          address_2,
          city,
          state,
          county,
          postcode,
          country
        FROM purchase_order_addresses
        WHERE purchase_order_id=$1`,
      [id],
    );

    return {
      order: orderResult.rows[0],

      lines: linesWithAllocations,

      primary_address:
        addressResult.rows.find((x) => x.address_type === "primary") || null,

      billing_address:
        addressResult.rows.find((x) => x.address_type === "billing") || null,

      shipping_address:
        addressResult.rows.find((x) => x.address_type === "shipping") || null,
    };
  }

  static async create(
    companyId: string,
    rawPayload: unknown,
  ): Promise<PurchaseOrder> {
    const payload = PurchaseOrderPayloadSchema.parse(
      rawPayload,
    ) as PurchaseOrderPayload;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      const order = payload.order;

      const seqResult = await client.query(
        `SELECT get_next_sequence($1, $2) AS code`,
        [companyId, "purchase_order"],
      );
      const orderNo = seqResult.rows[0].code;

      const supplierResult = await client.query(
        `SELECT id FROM parties WHERE id = $1 AND company_id = $2`,
        [order.supplier_id, companyId],
      );
      if (!supplierResult.rows.length) throw new Error("Supplier not found");

      const orderResult = await client.query(
        `
          INSERT INTO purchase_orders (
            company_id,
            order_no,

            supplier_id,
            supplier_no,

            purchaser,
            consignment_no,
            supp_order_no,
            link_to_so_no,

            currency_id,
            exchange_rate,

            order_date,
            req_receipt_date,
            receipt_date,
            expected_date,
            invoice_date,
            due_date,

            reference,

            payable_bank,
            payable_bank_id,

            payment_terms_id,
            payment_method_id,

            previous_code,
            link_to_cust,
            deduct_from_rebate,

            contact,
            book_in_phone,
            book_in_contact,
            book_in_email,

            shipment_method_id,
            shipping_agent,
            shipment_ref_no,
            warehouse_ref_no,
            shipment_po_not_req,

            reason,
            linked_po,

            notes,
            internal_notes,

            subtotal,
            tax_amount,
            total_amount,

            status,

            created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,$31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, NOW()
        RETURNING *;
        `,
        [
          companyId,
          orderNo,

          order.supplier_id,
          order.supplier_no,

          order.purchaser,
          order.consignment_no,
          order.supp_order_no,
          order.link_to_so_no,

          order.currency_id,
          order.exchange_rate,

          order.order_date || null,
          order.req_receipt_date || null,
          order.receipt_date || null,
          order.expected_date || null,
          order.invoice_date?.trim() ? order.invoice_date : null,
          order.due_date || null,

          order.reference,

          order.payable_bank,
          order.payable_bank_id,

          order.payment_terms_id,
          order.payment_method_id,

          order.previous_code,
          order.link_to_cust,
          order.deduct_from_rebate,

          order.contact,
          order.book_in_phone,
          order.book_in_contact,
          order.book_in_email,

          order.shipment_method_id,
          order.shipping_agent,
          order.shipment_ref_no,
          order.warehouse_ref_no,
          order.shipment_po_not_req,

          order.reason,
          order.linked_po,

          order.notes,
          order.internal_notes,

          order.subtotal,
          order.tax_amount,
          order.total_amount,

          order.status,
        ],
      );

      const createdOrder = orderResult.rows[0];
      let lineNo = 10000;

      for (const line of payload.lines) {
        // 1. Convert all explicit 'null' values inside the Zod line object into standard 'undefined'
        const entriesWithUndefined = Object.entries(line).map(
          ([key, value]) => [key, value === null ? undefined : value],
        );

        // 2. Re-assemble into a valid database PurchaseOrderLine instance
        const sanitizedLine = Object.fromEntries(
          entriesWithUndefined,
        ) as PurchaseOrderLine;

        // This will now compile cleanly without matching type errors
        await this.insertLine(
          client,
          companyId,
          createdOrder.id,
          sanitizedLine,
          lineNo,
        );
        lineNo += 10000;
      }

      if (payload.primary_address) {
        await this.insertAddress(
          client,
          createdOrder.id,
          payload.primary_address,
          companyId,
        );
      }

      if (payload.billing_address) {
        await this.insertAddress(
          client,
          createdOrder.id,
          payload.billing_address,
          companyId,
        );
      }
      if (payload.shipping_address) {
        await this.insertAddress(
          client,
          createdOrder.id,
          payload.shipping_address,
          companyId,
        );
      }

      await client.query("COMMIT");
      return createdOrder;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static async update(
    client: PoolClient,
    companyId: string,
    id: string,
    rawPayload: unknown,
  ): Promise<
    { id: string; item_id: string; warehouse_id: string; line_no: number }[]
  > {
    // const payload = PurchaseOrderPayloadSchema.parse(rawPayload);
    const payload = PurchaseOrderPayloadSchema.parse(
      rawPayload,
    ) as PurchaseOrderPayload;

    // try {
    //   await client.query("BEGIN");
    const order = payload.order;

    const existingResult = await client.query(
      `SELECT status FROM purchase_orders WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!existingResult.rows.length)
      throw new Error("Purchase order not found");
    if (existingResult.rows[0].status === "posted") {
      throw new Error("Posted purchase order cannot be modified");
    }

    await client.query(
      `
        UPDATE purchase_orders
          SET

          supplier_id=$1,
          supplier_no=$2,

          purchaser=$3,
          consignment_no=$4,
          supp_order_no=$5,
          link_to_so_no=$6,

          currency_id=$7,
          exchange_rate=$8,

          order_date=$9,
          req_receipt_date=$10,
          receipt_date=$11,
          expected_date=$12,
          invoice_date=$13,
          due_date=$14,

          reference=$15,

          payable_bank=$16,
          payable_bank_id=$17,

          payment_terms_id=$18,
          payment_method_id=$19,

          previous_code=$20,
          link_to_cust=$21,
          deduct_from_rebate=$22,

          contact=$23,
          book_in_phone=$24,
          book_in_contact=$25,
          book_in_email=$26,

          shipment_method_id=$27,
          shipping_agent=$28,
          shipment_ref_no=$29,
          warehouse_ref_no=$30,
          shipment_po_not_req=$31,

          reason=$32,
          linked_po=$33,

          notes=$34,
          internal_notes=$35,

          subtotal=$36,
          tax_amount=$37,
          total_amount=$38,

          status=$39,

          updated_at=NOW()

          WHERE id=$40 AND company_id=$41;
        `,

      [
        order.supplier_id,
        order.supplier_no,

        order.purchaser,
        order.consignment_no,
        order.supp_order_no,
        order.link_to_so_no,

        order.currency_id,
        order.exchange_rate,

        order.order_date || null,
        order.req_receipt_date || null,
        order.receipt_date || null,
        order.expected_date || null,
        order.invoice_date?.trim() ? order.invoice_date : null,
        order.due_date || null,

        order.reference,

        order.payable_bank,
        order.payable_bank_id,

        order.payment_terms_id,
        order.payment_method_id,

        order.previous_code,
        order.link_to_cust,
        order.deduct_from_rebate,

        order.contact,
        order.book_in_phone,
        order.book_in_contact,
        order.book_in_email,

        order.shipment_method_id,
        order.shipping_agent,
        order.shipment_ref_no,
        order.warehouse_ref_no,
        order.shipment_po_not_req,

        order.reason,
        order.linked_po,

        order.notes,
        order.internal_notes,

        order.subtotal,
        order.tax_amount,
        order.total_amount,

        order.status,
        id,
        companyId,
      ],
    );

    // Soft delete unlinked line entries
    const existingLinesResult = await client.query(
      `SELECT id FROM purchase_order_lines WHERE purchase_order_id = $1 AND is_deleted = false`,
      [id],
    );
    const existingLineIds = existingLinesResult.rows.map((x) => x.id);
    const incomingLineIds = payload.lines.map((x) => x.id).filter(Boolean);

    for (const existingId of existingLineIds) {
      if (!incomingLineIds.includes(existingId)) {
        await client.query(
          `UPDATE purchase_order_lines SET is_deleted = true, updated_at = NOW() WHERE id = $1`,
          [existingId],
        );
      }
    }

    let lineNo = 10000;
    for (const line of payload.lines) {
      if (line.id) {
        await client.query(
          `
            UPDATE purchase_order_lines
            SET
              line_type = $1, item_id = $2, gl_account_id = $3, description = $4,
              warehouse_id = $5, uom_id = $6, quantity = $7,
              unit_cost = $8, discount_type = $9, discount_value = $10, discount_amount = $11,
              vat_percent = $12, vat_amount = $13, net_amount = $14, gross_amount = $15,
              line_no = $16, updated_at = NOW()
            WHERE id = $17
            `,
          [
            line.line_type,
            line.item_id,
            line.gl_account_id,
            line.description,
            line.warehouse_id,
            line.uom_id,
            line.quantity,
            line.unit_cost,
            line.discount_type,
            line.discount_value,
            line.discount_amount,
            line.vat_percent,
            line.vat_amount,
            line.net_amount,
            line.gross_amount,
            lineNo,
            line.id,
          ],
        );
      } else {
        // 1. Convert all explicit 'null' values inside the Zod line object into standard 'undefined'
        const entriesWithUndefined = Object.entries(line).map(
          ([key, value]) => [key, value === null ? undefined : value],
        );

        // 2. Re-assemble into a valid database PurchaseOrderLine instance
        const sanitizedLine = Object.fromEntries(
          entriesWithUndefined,
        ) as PurchaseOrderLine;

        await this.insertLine(client, companyId, id, sanitizedLine, lineNo);
      }
      lineNo += 10000;
    }

    await client.query(
      `DELETE FROM purchase_order_addresses WHERE purchase_order_id = $1`,
      [id],
    );

    if (payload.primary_address) {
      await this.insertAddress(client, id, payload.primary_address, companyId);
    }

    if (payload.billing_address) {
      await this.insertAddress(client, id, payload.billing_address, companyId);
    }
    if (payload.shipping_address) {
      await this.insertAddress(client, id, payload.shipping_address, companyId);
    }

    await this.recalculateStatus(client, id);

    const finalLines = await client.query<{
      id: string;
      item_id: string;
      warehouse_id: string;
      line_no: number;
    }>(
      `SELECT id, item_id, warehouse_id, line_no FROM purchase_order_lines 
       WHERE purchase_order_id = $1 AND is_deleted = false ORDER BY line_no`,
      [id],
    );

    return finalLines.rows;
    //   await client.query("COMMIT");
    // } catch (err) {
    //   await client.query("ROLLBACK");
    //   throw err;
    // } finally {
    //   client.release();
    // }
  }

  static async delete(companyId: string, id: string): Promise<void> {
    const existing = await pool.query(
      `SELECT status FROM purchase_orders WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (!existing.rows.length) throw new Error("Purchase order not found");
    if (
      existing.rows[0].status === "received" ||
      existing.rows[0].status === "partial_received"
    ) {
      throw new Error(
        "Cannot delete document shell while historical ledger entries remain linked.",
      );
    }

    const result = await pool.query(
      `DELETE FROM purchase_orders WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!result.rowCount) throw new Error("Purchase order not found");
  }

  static async post(companyId: string, id: string): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `SELECT status, is_posted FROM purchase_orders WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );

      if (!result.rows.length) throw new Error("Purchase order not found");
      if (result.rows[0].is_posted)
        throw new Error("Purchase order already posted");

      await client.query(
        `UPDATE purchase_orders SET is_posted = true, posted_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [id],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  private static async insertLine(
    client: PoolClient,
    companyId: string,
    purchaseOrderId: string,
    line: PurchaseOrderLine,
    lineNo: number,
  ): Promise<void> {
    await client.query(
      `
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
    )
    VALUES (
      $1,$2,$3,$4,
      $5,$6,$7,$8,
      $9,$10,$11,$12,
      $13,$14,$15,$16,
      $17,$18,$19,$20,
      false,
      NOW()
    )
    `,
      [
        companyId,
        purchaseOrderId,
        lineNo,
        line.line_type,
        line.item_id || null,
        line.gl_account_id || null,
        line.description || null,
        line.warehouse_id || null,
        line.uom_id || null,
        line.quantity || 0,
        line.received_quantity || 0,
        line.unit_cost || 0,
        line.discount_type || null,
        line.discount_value || 0,
        line.discount_amount || 0,
        line.vat_percent || 0,
        line.vat_amount || 0,
        line.net_amount || 0,
        line.gross_amount || 0,
      ],
    );
  }

  private static async insertAddress(
    client: PoolClient,
    purchaseOrderId: string,
    address: PurchaseOrderAddress,
    companyId: string,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO purchase_order_addresses
      (
          purchase_order_id,
          company_id,
          address_type,

          name,
          attention,

          phone,
          email,

          address_1,
          address_2,

          city,
          state,
          county,

          postcode,
          country,

          contact_person,
          contact_name
      )
      VALUES
      (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16
      )
      `,
      [
        purchaseOrderId,
        companyId,
        address.address_type,

        address.name,
        address.attention,

        address.phone,
        address.email,

        address.address_1,
        address.address_2,

        address.city,
        address.state,
        address.county,

        address.postcode,
        address.country,

        address.contact_person,
        address.contact_name,
      ],
    );

    /* await client.query(
      `
      INSERT INTO purchase_order_addresses (
        purchase_order_id,
        address_type,
        name,
        phone,
        email,
        address_1,
        address_2,
        city,
        state,
        postcode,
        country,
        company_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12
      )
      `,
      [
        purchaseOrderId,
        address.address_type,
        address.name || null,
        address.phone || null,
        address.email || null,
        address.address_1 || null,
        address.address_2 || null,
        address.city || null,
        address.state || null,
        address.postcode || null,
        address.country || null,
        companyId,
      ],
    ); */
  }

  static async recalculateStatus(
    client: PoolClient,
    purchaseOrderId: string,
  ): Promise<void> {
    const result = await client.query(
      `
      SELECT quantity, received_quantity, COALESCE(cancelled_quantity, 0) as cancelled_quantity
      FROM purchase_order_lines
      WHERE purchase_order_id = $1 AND is_deleted = false AND line_type = 'ITEM'
      `,
      [purchaseOrderId],
    );

    const lines = result.rows;
    if (!lines.length) return;

    let fullyReceived = true;
    let partiallyReceived = false;

    for (const line of lines) {
      const qty = Number(line.quantity || 0);
      const received =
        Number(line.received_quantity || 0) + Number(line.cancelled_quantity);

      if (received > 0) partiallyReceived = true;
      if (received < qty) fullyReceived = false;
    }

    const status = fullyReceived
      ? "received"
      : partiallyReceived
        ? "partial_received"
        : "open";

    await client.query(
      `UPDATE purchase_orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, purchaseOrderId],
    );
  }

  static async updateReceivedQuantity(
    client: PoolClient,
    purchaseOrderLineId: string,
    receivedQty: number,
  ): Promise<void> {
    await client.query(
      `
    UPDATE purchase_order_lines
    SET
      received_quantity =
        COALESCE(received_quantity, 0) + $1,

      remaining_quantity =
        quantity - (
          COALESCE(received_quantity,0)
          + $1
          + COALESCE(cancelled_quantity,0)
        ),

      updated_at = NOW()

    WHERE id = $2
    `,
      [receivedQty, purchaseOrderLineId],
    );
  }

  // Add this inside your PurchaseOrderService class

  static async saveLineAllocations(
    client: PoolClient,
    companyId: string,
    purchaseOrderId: string,
    purchaseOrderLineId: string,
    itemId: string,
    warehouseId: string,
    initialAllocations: StockAllocationRecord[],
  ): Promise<void> {
    // 1. Clear any existing manual entries for this specific line to prevent duplicates on update
    await client.query(
      `
      DELETE FROM inventory_allocations
      WHERE purchase_order_line_id = $1 AND company_id = $2
      `,
      [purchaseOrderLineId, companyId],
    );

    if (!initialAllocations || !initialAllocations.length) return;

    // 2. Insert the fresh mock/planned allocation array from the UI modal
    for (const alloc of initialAllocations) {
      await client.query(
        `
        INSERT INTO inventory_allocations (
          company_id,
          outbound_entry_id,
          inbound_entry_id,
          purchase_order_line_id,
          item_id,
          warehouse_id,
          batch_no,
          expiry_date,
          allocated_quantity,
          unit_cost,
          total_cost,
          allocation_method,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'FIFO', 'ACTIVE')
        `,
        [
          companyId,
          null,
          null,
          purchaseOrderLineId,
          itemId,
          warehouseId,
          alloc.batch_no || null,
          alloc.expiry_date === "" ? null : alloc.expiry_date || null,
          Number(alloc.quantity) || 0,
          0,
          0,
        ],
      );
    }
  }

  private static validatePayload(payload: PurchaseOrderPayload): void {
    const order = payload.order;

    if (!order.supplier_id) {
      throw new Error("Supplier is required");
    }

    if (!order.order_date) {
      throw new Error("Order date is required");
    }

    if (!payload.lines.length) {
      throw new Error("At least one line is required");
    }

    payload.lines.forEach((line, index) => {
      const row = index + 1;

      if (!line.line_type) {
        throw new Error(`Line ${row}: line type is required`);
      }

      switch (line.line_type) {
        case "ITEM":
          if (!line.item_id) {
            throw new Error(`Line ${row}: item is required`);
          }

          if (!line.uom_id) {
            throw new Error(`Line ${row}: UOM is required`);
          }

          if (Number(line.quantity) <= 0) {
            throw new Error(`Line ${row}: quantity must be greater than zero`);
          }

          if (Number(line.unit_cost) < 0) {
            throw new Error(`Line ${row}: invalid unit cost`);
          }

          break;

        case "GL_ACCOUNT":
          if (!line.gl_account_id) {
            throw new Error(`Line ${row}: GL account is required`);
          }

          if (Number(line.quantity) <= 0) {
            throw new Error(`Line ${row}: quantity must be greater than zero`);
          }

          if (Number(line.unit_cost) < 0) {
            throw new Error(`Line ${row}: invalid amount`);
          }

          break;

        case "COMMENT":
          break;

        default:
          throw new Error(`Line ${row}: invalid line type`);
      }
    });

    if (!payload.billing_address) {
      throw new Error("Billing address is required");
    }

    if (!payload.shipping_address) {
      throw new Error("Shipping address is required");
    }
  }
}

/* static async get(companyId: string, id: string) {
    const orderResult = await pool.query(
      `SELECT po.*, p.name AS supplier_name
      FROM purchase_orders po
      LEFT JOIN parties p ON p.id = po.supplier_id
      WHERE po.id = $1 AND po.company_id = $2`,
      [id, companyId],
    );

    if (!orderResult.rows.length) return null;

    // Modified query using LEFT JOINs to fetch codes and names for the frontend UI components
    const linesResult = await pool.query(
      `
      SELECT 
        pol.*, 
        (pol.quantity - COALESCE(pol.received_quantity, 0)) AS remaining_quantity,
        
        i.item_code,
        i.name AS item_name,        

        gl.code AS account_code,
        gl.name AS account_name,
        

        w.code AS warehouse_code,
        w.name AS warehouse_name,

        u.name AS uom_name
      FROM purchase_order_lines pol
      LEFT JOIN items i ON pol.item_id = i.id AND i.company_id = $2
      LEFT JOIN chart_of_accounts gl ON pol.gl_account_id = gl.id AND gl.company_id = $2
      LEFT JOIN warehouses w ON pol.warehouse_id = w.id AND w.company_id = $2
      LEFT JOIN uoms u ON pol.uom_id = u.id AND u.company_id = $2
      WHERE pol.purchase_order_id = $1 AND pol.is_deleted = false
      ORDER BY pol.line_no
      `,
      [id, companyId],
    );

    const allocationsResult = await pool.query(
      `
      SELECT 
        id,
        purchase_order_line_id,
        item_id,
        warehouse_id,
        quantity,
        batch_no,
        serial_no,
        TO_CHAR(date_received, 'YYYY-MM-DD') as date_received,
        TO_CHAR(prod_date, 'YYYY-MM-DD') as prod_date,
        TO_CHAR(expiry_date, 'YYYY-MM-DD') as expiry_date
      FROM inventory_allocations
      WHERE purchase_order_id = $1 AND company_id = $2
      `,
      [id, companyId],
    );

    const linesWithAllocations = linesResult.rows.map((line) => {
      const lineAllocations = allocationsResult.rows
        .filter((alloc) => alloc.purchase_order_line_id === line.id)
        .map((alloc) => ({
          date_received: alloc.date_received || "",
          prod_date: alloc.prod_date || "",
          expiry_date: alloc.expiry_date || "",
          batch_no: alloc.batch_no || "",
          serial_no: alloc.serial_no || "",
          quantity: Number(alloc.quantity) || 0,
        }));

      return {
        ...line,
        initialAllocations: lineAllocations,
      };
    });

    const addressResult = await pool.query(
      `SELECT * FROM purchase_order_addresses WHERE purchase_order_id = $1`,
      [id],
    );

    return {
      order: orderResult.rows[0],
      lines: linesWithAllocations,
      // lines: linesResult.rows,
      billing_address:
        addressResult.rows.find((x) => x.address_type === "billing") || null,
      shipping_address:
        addressResult.rows.find((x) => x.address_type === "shipping") || null,
    };
  } */
