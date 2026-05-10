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
      ORDER BY created_at ASC
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
          $7,$8,$9,$10,$11,$12,
          now()
        )
        RETURNING *
        `,
        [
          companyId,
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
      for (const line of payload.lines) {
        await this.insertLine(client, companyId, createdOrder.id, line);
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
       * DELETE LINES
       * -----------------------------------------------------
       */
      await client.query(
        `
        DELETE FROM purchase_order_lines
        WHERE purchase_order_id = $1
        `,
        [id],
      );

      /**
       * -----------------------------------------------------
       * INSERT LINES
       * -----------------------------------------------------
       */
      for (const line of payload.lines) {
        await this.insertLine(client, companyId, id, line);
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

      if (result.rows[0].status === "posted") {
        throw new Error("Purchase order already posted");
      }

      await client.query(
        `
        UPDATE purchase_orders
        SET
          status = 'posted',
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
  ): Promise<void> {
    await client.query(
      `
      INSERT INTO purchase_order_lines (
        company_id,
        purchase_order_id,
        item_id,
        description,
        warehouse_id,
        uom_id,
        quantity,
        received_quantity,
        unit_cost,
        tax_percent,
        tax_amount,
        line_total,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,
        now()
      )
      `,
      [
        companyId,

        purchaseOrderId,

        line.item_id,

        line.description || null,

        line.warehouse_id || null,

        line.uom_id || null,

        line.quantity,

        line.received_quantity || 0,

        line.unit_cost,

        line.tax_percent || 0,

        line.tax_amount || 0,

        line.line_total || 0,
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

    if (!order.supplier_id) {
      throw new Error("Supplier is required");
    }

    if (!order.order_date) {
      throw new Error("Order date is required");
    }

    if (!payload.lines.length) {
      throw new Error("At least one line is required");
    }

    for (const line of payload.lines) {
      if (!line.item_id) {
        throw new Error("Item is required");
      }

      if (Number(line.quantity) <= 0) {
        throw new Error("Quantity must be greater than zero");
      }
    }

    if (!payload.billing_address) {
      throw new Error("Billing address is required");
    }

    if (!payload.shipping_address) {
      throw new Error("Shipping address is required");
    }
  }
}
