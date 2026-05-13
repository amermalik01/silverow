// lib/services/inventory/inventory-movement.service.ts

import { PoolClient } from "pg";
import { pool } from "@/lib/db";

export type InventoryTransactionType =
  | "PURCHASE_RECEIPT"
  | "PURCHASE_RETURN"
  | "SALES_SHIPMENT"
  | "SALES_RETURN"
  | "TRANSFER"
  | "ADJUSTMENT"
  | "PRODUCTION_OUTPUT"
  | "PRODUCTION_CONSUMPTION";

export type InventoryMovementLineInput = {
  item_id: string;

  warehouse_id: string;

  location_id?: string | null;

  uom_id?: string | null;

  quantity: number;

  unit_cost?: number;

  movement_direction: "IN" | "OUT";

  batch_no?: string | null;

  serial_no?: string | null;

  expiry_date?: string | null;
};

export type PostInventoryTransactionInput = {
  company_id: string;

  transaction_type: InventoryTransactionType;

  posting_date: string;

  reference_type?: string | null;

  reference_id?: string | null;

  created_by?: string | null;

  lines: InventoryMovementLineInput[];
};

export class InventoryMovementService {
  /**
   * =========================================================
   * POST TRANSACTION
   * =========================================================
   */
  static async postTransaction(
    client: PoolClient,
    data: PostInventoryTransactionInput,
  ): Promise<string> {
    /**
     * -------------------------------------------------------
     * GENERATE DOCUMENT NO
     * -------------------------------------------------------
     */
    const seqResult = await client.query(
      `
      SELECT get_next_sequence($1,$2) AS code
      `,
      [data.company_id, "inventory_transaction"],
    );

    const transactionNo = seqResult.rows[0].code;

    /**
     * -------------------------------------------------------
     * INSERT HEADER
     * -------------------------------------------------------
     */
    const headerResult = await client.query(
      `
      INSERT INTO inventory_transactions (
        company_id,
        transaction_no,
        transaction_type,
        reference_type,
        reference_id,
        posting_date,
        status,
        created_by,
        created_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        now()
      )
      RETURNING id
      `,
      [
        data.company_id,

        transactionNo,

        data.transaction_type,

        data.reference_type || null,

        data.reference_id || null,

        data.posting_date,

        "posted",

        data.created_by || null,
      ],
    );

    const transactionId = headerResult.rows[0].id;

    /**
     * -------------------------------------------------------
     * INSERT LINES
     * -------------------------------------------------------
     */
    let lineNo = 10000;

    for (const line of data.lines) {
      const qty =
        line.movement_direction === "OUT"
          ? -Math.abs(Number(line.quantity))
          : Math.abs(Number(line.quantity));

      const unitCost = Number(line.unit_cost || 0);

      const totalCost = qty * unitCost;

      await client.query(
        `
        INSERT INTO inventory_transaction_lines (
          company_id,
          transaction_id,
          line_no,
          warehouse_id,
          location_id,
          item_id,
          uom_id,
          quantity,
          base_quantity,
          movement_direction,
          unit_cost,
          total_cost,
          batch_no,
          serial_no,
          expiry_date,
          created_at
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,
          now()
        )
        `,
        [
          data.company_id,

          transactionId,

          lineNo,

          line.warehouse_id,

          line.location_id || null,

          line.item_id,

          line.uom_id || null,

          qty,

          qty,

          line.movement_direction,

          unitCost,

          totalCost,

          line.batch_no || null,

          line.serial_no || null,

          line.expiry_date || null,
        ],
      );

      /**
       * -----------------------------------------------------
       * UPDATE STOCK SNAPSHOT
       * -----------------------------------------------------
       */
      await client.query(
        `
        SELECT post_inventory_transaction(
          $1,$2,$3,$4,$5,$6,$7,$8
        )
        `,
        [
          data.company_id,

          line.item_id,

          line.warehouse_id,

          line.location_id || null,

          qty,

          unitCost,

          line.batch_no || null,

          line.serial_no || null,
        ],
      );

      lineNo += 10000;
    }

    return transactionId;
  }
}

export async function postInventoryTransaction(data: {
  company_id: string;
  item_id: string;
  warehouse_id: string;
  quantity: number;
  unit_cost?: number | null;
  transaction_type: number;
  reference_type?: string;
  reference_id?: string;
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    /**
     * MOVEMENT LOG
     */
    await client.query(
      `
      INSERT INTO inventory_transactions (
        company_id,
        item_id,
        warehouse_id,
        quantity,
        unit_cost,
        transaction_type,
        reference_type,
        reference_id,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
      `,
      [
        data.company_id,
        data.item_id,
        data.warehouse_id,
        data.quantity,
        data.unit_cost ?? null,
        data.transaction_type,
        data.reference_type ?? null,
        data.reference_id ?? null,
      ],
    );

    /**
     * SNAPSHOT UPDATE (on-hand stock)
     */
    await client.query(
      `
      UPDATE product_warehouse_stock
      SET quantity = quantity + $1
      WHERE product_id = $2
      AND warehouse_id = $3
      `,
      [data.quantity, data.item_id, data.warehouse_id],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
