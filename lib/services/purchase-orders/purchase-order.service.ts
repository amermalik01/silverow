// lib/services/purchase-orders/purchase-order.service.ts

import { PoolClient } from "pg";

import { pool } from "@/lib/db";

import {
  PurchaseOrder,
  PurchaseOrderAddress,
  PurchaseOrderLine,
  PurchaseOrderPayload,
} from "@/types/purchase-order";

export class PurchaseOrderService {
  /**
   * =========================================================
   * LIST
   * =========================================================
   */
  static async list(companyId: string): Promise<PurchaseOrder[]> {
    const result = await pool.query(
      `
      SELECT
        po.*,
        p.name AS supplier_name

      FROM purchase_orders po

      LEFT JOIN parties p
        ON p.id = po.supplier_id

      WHERE po.company_id = $1

      ORDER BY po.created_at DESC
      `,
      [companyId],
    );

    return result.rows;
  }

  /**
   * =========================================================
   * GET
   * =========================================================
   */
  static async get(
    companyId: string,
    id: string,
  ): Promise<{
    order: PurchaseOrder;
    lines: PurchaseOrderLine[];
    billing_address: PurchaseOrderAddress | null;
    shipping_address: PurchaseOrderAddress | null;
  } | null> {
    const orderResult = await pool.query(
      `
      SELECT *
      FROM purchase_orders
      WHERE id = $1
      AND company_id = $2
      `,
      [id, companyId],
    );

    if (!orderResult.rows.length) {
      return null;
    }

    const linesResult = await pool.query(
      `
      SELECT *
      FROM purchase_order_lines
      WHERE purchase_order_id = $1
      AND is_deleted = false
      ORDER BY line_no ASC
      `,
      [id],
    );

    const addressResult = await pool.query(
      `
      SELECT *
      FROM purchase_order_addresses
      WHERE purchase_order_id = $1
      `,
      [id],
    );

    const billing =
      addressResult.rows.find((x) => x.address_type === "billing") || null;

    const shipping =
      addressResult.rows.find((x) => x.address_type === "shipping") || null;

    return {
      order: orderResult.rows[0],
      lines: linesResult.rows,
      billing_address: billing,
      shipping_address: shipping,
    };
  }

  /**
   * =========================================================
   * CREATE
   * =========================================================
   */
  static async create(
    companyId: string,
    payload: PurchaseOrderPayload,
  ): Promise<PurchaseOrder> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      this.validatePayload(payload);

      const order = payload.order;

      /**
       * -----------------------------------------------------
       * GENERATE PURCHASE ORDER NUMBER
       * -----------------------------------------------------
       */
      const seqResult = await client.query(
        `
      SELECT get_next_sequence($1,$2) AS code
      `,
        [companyId, "purchase_order"],
      );

      const orderNo = seqResult.rows[0].code;

      /**
       * -----------------------------------------------------
       * SUPPLIER
       * -----------------------------------------------------
       */
      const supplierResult = await client.query(
        `
        SELECT id, name
        FROM parties
        WHERE id = $1
        AND company_id = $2
        `,
        [order.supplier_id, companyId],
      );

      if (!supplierResult.rows.length) {
        throw new Error("Supplier not found");
      }

      const supplier = supplierResult.rows[0];

      /**
       * -----------------------------------------------------
       * HEADER
       * -----------------------------------------------------
       */
      const orderResult = await client.query(
        `
        INSERT INTO purchase_orders (
          company_id,
          order_no,
          supplier_id,
          order_date,
          expected_date,
          warehouse_id,
          currency_id,
          reference,
          notes,
          subtotal,
          tax_amount,
          total_amount,
          status,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,$11,$12,$13,
          now()
        )
        RETURNING *
        `,
        [
          companyId,
          orderNo,
          supplier.id,

          order.order_date,

          order.expected_date || null,

          order.warehouse_id || null,

          order.currency_id || null,

          order.reference || null,

          order.notes || null,

          order.subtotal || 0,

          order.tax_amount || 0,

          order.total_amount || 0,

          order.status || "draft",
        ],
      );

      const createdOrder = orderResult.rows[0];

      /**
       * -----------------------------------------------------
       * LINES
       * -----------------------------------------------------
       */
      let lineNo = 10000;

      for (const line of payload.lines) {
        await this.insertLine(client, companyId, createdOrder.id, line, lineNo);

        lineNo += 10000;
      }

      /**
       * -----------------------------------------------------
       * BILLING ADDRESS
       * -----------------------------------------------------
       */
      if (payload.billing_address) {
        await this.insertAddress(
          client,
          createdOrder.id,
          payload.billing_address,
        );
      }

      /**
       * -----------------------------------------------------
       * SHIPPING ADDRESS
       * -----------------------------------------------------
       */
      if (payload.shipping_address) {
        await this.insertAddress(
          client,
          createdOrder.id,
          payload.shipping_address,
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

  /**
   * =========================================================
   * UPDATE
   * =========================================================
   */
  static async update(
    companyId: string,
    id: string,
    payload: PurchaseOrderPayload,
  ): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      this.validatePayload(payload);

      const order = payload.order;

      /**
       * -----------------------------------------------------
       * EXISTING
       * -----------------------------------------------------
       */
      const existingResult = await client.query(
        `
        SELECT *
        FROM purchase_orders
        WHERE id = $1
        AND company_id = $2
        `,
        [id, companyId],
      );

      if (!existingResult.rows.length) {
        throw new Error("Purchase order not found");
      }

      const existing = existingResult.rows[0];

      if (existing.status === "posted") {
        throw new Error("Posted purchase order cannot be modified");
      }

      /**
       * -----------------------------------------------------
       * UPDATE HEADER
       * -----------------------------------------------------
       */
      await client.query(
        `
        UPDATE purchase_orders
        SET
          supplier_id = $1,
          order_date = $2,
          expected_date = $3,
          warehouse_id = $4,
          currency_id = $5,
          reference = $6,
          notes = $7,
          subtotal = $8,
          tax_amount = $9,
          total_amount = $10,
          updated_at = now()
        WHERE id = $11
        `,
        [
          order.supplier_id,

          order.order_date,

          order.expected_date || null,

          order.warehouse_id || null,

          order.currency_id || null,

          order.reference || null,

          order.notes || null,

          order.subtotal || 0,

          order.tax_amount || 0,

          order.total_amount || 0,

          id,
        ],
      );

      /**
       * -----------------------------------------------------
       * EXISTING LINES
       * -----------------------------------------------------
       */
      const existingLinesResult = await client.query(
        `
        SELECT id
        FROM purchase_order_lines
        WHERE purchase_order_id = $1
        AND is_deleted = false
        `,
        [id],
      );

      const existingLineIds = existingLinesResult.rows.map((x) => x.id);

      const incomingLineIds = payload.lines
        .filter((x) => x.id)
        .map((x) => x.id);

      /**
       * -----------------------------------------------------
       * SOFT DELETE REMOVED LINES
       * -----------------------------------------------------
       */
      for (const existingId of existingLineIds) {
        if (!incomingLineIds.includes(existingId)) {
          await client.query(
            `
      UPDATE purchase_order_lines
      SET
        is_deleted = true,
        updated_at = now()
      WHERE id = $1
      `,
            [existingId],
          );
        }
      }

      /**
       * -----------------------------------------------------
       * UPSERT LINES
       * -----------------------------------------------------
       */
      let lineNo = 10000;

      for (const line of payload.lines) {
        /**
         * EXISTING LINE
         */
        if (line.id) {
          await client.query(
            `
              UPDATE purchase_order_lines
              SET
                line_type = $1,
                item_id = $2,
                gl_account_id = $3,
                description = $4,
                warehouse_id = $5,
                warehouse_location_id = $6,
                uom_id = $7,
                quantity = $8,
                unit_cost = $9,
                discount_type = $10,
                discount_value = $11,
                discount_amount = $12,
                vat_percent = $13,
                vat_amount = $14,
                net_amount = $15,
                gross_amount = $16,
                line_no = $17,
                updated_at = now()
              WHERE id = $18
            `,
            [
              line.line_type,
              line.item_id || null,
              line.gl_account_id || null,
              line.description || null,
              line.warehouse_id || null,
              line.warehouse_location_id || null,

              line.uom_id || null,
              line.quantity || 0,
              line.unit_cost || 0,

              line.discount_type || null,
              line.discount_value || 0,
              line.discount_amount || 0,

              line.vat_percent || 0,
              line.vat_amount || 0,
              line.net_amount || 0,
              line.gross_amount || 0,

              lineNo,
              line.id,
            ],
          );
        } else {
          /**
           * NEW LINE
           */
          await this.insertLine(client, companyId, id, line, lineNo);
        }

        lineNo += 10000;
      }

      /**
       * -----------------------------------------------------
       * DELETE ADDRESSES
       * -----------------------------------------------------
       */
      await client.query(
        `
        DELETE FROM purchase_order_addresses
        WHERE purchase_order_id = $1
        `,
        [id],
      );

      /**
       * -----------------------------------------------------
       * BILLING ADDRESS
       * -----------------------------------------------------
       */
      if (payload.billing_address) {
        await this.insertAddress(client, id, payload.billing_address);
      }

      /**
       * -----------------------------------------------------
       * SHIPPING ADDRESS
       * -----------------------------------------------------
       */
      if (payload.shipping_address) {
        await this.insertAddress(client, id, payload.shipping_address);
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

  /**
   * =========================================================
   * DELETE
   * =========================================================
   */
  static async delete(companyId: string, id: string): Promise<void> {
    const result = await pool.query(
      `
      DELETE FROM purchase_orders
      WHERE id = $1
      AND company_id = $2
      `,
      [id, companyId],
    );

    if (!result.rowCount) {
      throw new Error("Purchase order not found");
    }
  }

  /**
   * =========================================================
   * POST
   * =========================================================
   */
  static async post(companyId: string, id: string): Promise<void> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
        SELECT status
        FROM purchase_orders
        WHERE id = $1
        AND company_id = $2
        `,
        [id, companyId],
      );

      if (!result.rows.length) {
        throw new Error("Purchase order not found");
      }

      if (result.rows[0].is_posted) {
        throw new Error("Purchase order already posted");
      }

      await client.query(
        `
          UPDATE purchase_orders
          SET
            is_posted = true,
            posted_at = now(),
            updated_at = now()
          WHERE id = $1
          `,
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

  /**
   * =========================================================
   * INSERT LINE
   * =========================================================
   */
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

        line.warehouse_location_id || null,

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

  /**
   * =========================================================
   * INSERT ADDRESS
   * =========================================================
   */
  private static async insertAddress(
    client: PoolClient,
    purchaseOrderId: string,
    address: PurchaseOrderAddress,
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO purchase_order_addresses (
        purchase_order_id,
        address_type,
        contact_name,
        company_name,
        phone,
        email,
        address_1,
        address_2,
        city,
        state,
        postcode,
        country
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12
      )
      `,
      [
        purchaseOrderId,

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

  /**
   * =========================================================
   * VALIDATION
   * =========================================================
   */

  private static validatePayload(payload: PurchaseOrderPayload): void {
    const order = payload.order;

    /**
     * -------------------------------------------------------
     * HEADER
     * -------------------------------------------------------
     */
    if (!order.supplier_id) {
      throw new Error("Supplier is required");
    }

    if (!order.order_date) {
      throw new Error("Order date is required");
    }

    if (!payload.lines.length) {
      throw new Error("At least one line is required");
    }

    /**
     * -------------------------------------------------------
     * LINES
     * -------------------------------------------------------
     */
    payload.lines.forEach((line, index) => {
      const row = index + 1;

      if (!line.line_type) {
        throw new Error(`Line ${row}: line type is required`);
      }

      switch (line.line_type) {
        /**
         * ---------------------------------------------------
         * ITEM
         * ---------------------------------------------------
         */
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

        /**
         * ---------------------------------------------------
         * GL ACCOUNT
         * ---------------------------------------------------
         */
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

        /**
         * ---------------------------------------------------
         * COMMENT
         * ---------------------------------------------------
         */
        case "COMMENT":
          break;

        default:
          throw new Error(`Line ${row}: invalid line type`);
      }
    });

    /**
     * -------------------------------------------------------
     * ADDRESSES
     * -------------------------------------------------------
     */
    if (!payload.billing_address) {
      throw new Error("Billing address is required");
    }

    if (!payload.shipping_address) {
      throw new Error("Shipping address is required");
    }
  }

  /**
   * =========================================================
   * RECALCULATE STATUS
   * =========================================================
   */
  static async recalculateStatus(
    client: PoolClient,
    purchaseOrderId: string,
  ): Promise<void> {
    const result = await client.query(
      `
    SELECT
      quantity,
      received_quantity,
      cancelled_quantity

    FROM purchase_order_lines

    WHERE purchase_order_id = $1
    AND is_deleted = false
    AND line_type = 'ITEM'
    `,
      [purchaseOrderId],
    );

    const lines = result.rows;

    if (!lines.length) {
      return;
    }

    let fullyReceived = true;

    let partiallyReceived = false;

    for (const line of lines) {
      const qty = Number(line.quantity || 0);

      const received =
        Number(line.received_quantity || 0) +
        Number(line.cancelled_quantity || 0);

      if (received > 0) {
        partiallyReceived = true;
      }

      if (received < qty) {
        fullyReceived = false;
      }
    }

    let status = "open";

    if (fullyReceived) {
      status = "received";
    } else if (partiallyReceived) {
      status = "partial_received";
    }

    await client.query(
      `
    UPDATE purchase_orders
    SET
      status = $1,
      updated_at = now()
    WHERE id = $2
    `,
      [status, purchaseOrderId],
    );
  }

  /**
   * =========================================================
   * UPDATE RECEIVED QUANTITY
   * =========================================================
   */
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
}
