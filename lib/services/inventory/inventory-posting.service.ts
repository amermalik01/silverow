// lib/services/inventory/inventory-posting.service.ts
import { pool } from "@/lib/db";

export type PostInventoryInput = {
  company_id: string;

  item_id: string;

  warehouse_id: string;

  location_id?: string | null;

  quantity: number;

  unit_cost?: number | null;

  batch_no?: string | null;

  serial_no?: string | null;

  transaction_type: number;

  reference_type?: string | null;

  reference_id?: string | null;
};

export async function postInventoryTransaction(
  data: PostInventoryInput,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1 INSERT LEDGER

    await client.query(
      `
      INSERT INTO inventory_transactions (
        company_id,
        item_id,
        warehouse_id,
        location_id,
        quantity,
        unit_cost,
        batch_no,
        serial_no,
        transaction_type,
        reference_type,
        reference_id
      )

      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )
      `,
      [
        data.company_id,
        data.item_id,
        data.warehouse_id,
        data.location_id ?? null,
        data.quantity,
        data.unit_cost ?? null,
        data.batch_no ?? null,
        data.serial_no ?? null,
        data.transaction_type,
        data.reference_type ?? null,
        data.reference_id ?? null,
      ],
    );

    // 2 UPDATE SNAPSHOT

    await client.query(
      `
      SELECT post_inventory_transaction(
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      `,
      [
        data.company_id,
        data.item_id,
        data.warehouse_id,
        data.location_id ?? null,
        data.quantity,
        data.unit_cost ?? null,
        data.batch_no ?? null,
        data.serial_no ?? null,
      ],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");

    throw err;
  } finally {
    client.release();
  }
}