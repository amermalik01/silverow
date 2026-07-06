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
      `SELECT po.*, p.name AS supplier_name
     FROM purchase_orders po
     LEFT JOIN parties p ON p.id = po.supplier_id
     WHERE po.id = $1 AND po.company_id = $2`,
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
      billing_address:
        addressResult.rows.find((x) => x.address_type === "billing") || null,
      shipping_address:
        addressResult.rows.find((x) => x.address_type === "shipping") || null,
    };
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
            company_id, order_no, supplier_id, order_date, expected_date,
            currency_id, exchange_rate, reference, notes, 
            subtotal, tax_amount, total_amount, status, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
          RETURNING *
        `,
        [
          companyId,
          orderNo,
          order.supplier_id,
          order.order_date || null,
          order.expected_date === "" ? null : order.expected_date || null,
          // order.warehouse_id || null,
          order.currency_id,
          order.exchange_rate,
          order.reference || null,
          order.notes || null,
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
    companyId: string,
    id: string,
    rawPayload: unknown,
  ): Promise<void> {
    const payload = PurchaseOrderPayloadSchema.parse(rawPayload);
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
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
          supplier_id = $1, order_date = $2, expected_date = $3,
          currency_id = $4, exchange_rate = $5, reference = $6, notes = $7,
          subtotal = $8, tax_amount = $9, total_amount = $10, updated_at = now()
        WHERE id = $11
        `,
        [
          order.supplier_id,
          order.order_date || null,
          order.expected_date === "" ? null : order.expected_date || null,
          order.currency_id,
          order.exchange_rate,
          order.reference || null,
          order.notes || null,
          order.subtotal,
          order.tax_amount,
          order.total_amount,
          id,
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
            `UPDATE purchase_order_lines SET is_deleted = true, updated_at = now() WHERE id = $1`,
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
              warehouse_id = $5, warehouse_location_id = $6, uom_id = $7, quantity = $8,
              unit_cost = $9, discount_type = $10, discount_value = $11, discount_amount = $12,
              vat_percent = $13, vat_amount = $14, net_amount = $15, gross_amount = $16,
              line_no = $17, updated_at = now()
            WHERE id = $18
            `,
            [
              line.line_type,
              line.item_id,
              line.gl_account_id,
              line.description,
              line.warehouse_id,
              line.warehouse_location_id,
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

      if (payload.billing_address) {
        await this.insertAddress(
          client,
          id,
          payload.billing_address,
          companyId,
        );
      }
      if (payload.shipping_address) {
        await this.insertAddress(
          client,
          id,
          payload.shipping_address,
          companyId,
        );
      }

      await this.recalculateStatus(client, id);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
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
        `UPDATE purchase_orders SET is_posted = true, posted_at = now(), updated_at = now() WHERE id = $1`,
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
      warehouse_location_id,

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
      now()
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
        line.location_id || null,
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
    // const companyId = await getCompanyId();

    await client.query(
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
    );
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
      `UPDATE purchase_orders SET status = $1, updated_at = now() WHERE id = $2`,
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

      updated_at = now()

    WHERE id = $2
    `,
      [receivedQty, purchaseOrderLineId],
    );
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
