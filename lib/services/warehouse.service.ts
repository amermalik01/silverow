// lib/services/warehouse.service.ts

import { pool } from "@/lib/db";
import { CreateWarehouseInput } from "@/types/warehouse";

export async function createWarehouse(data: CreateWarehouseInput) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const seqRes = await client.query(
      `SELECT get_next_sequence($1,$2) AS code`,
      [data.company_id, "warehouse"],
    );

    const code = seqRes.rows[0].code;

    const warehouseRes = await client.query(
      `
      INSERT INTO warehouses (
        company_id, code, name, type, status, currency_id, storage_type_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        data.company_id,
        code,
        data.name,
        data.type,
        data.status || 1,
        data.currency_id,
        data.storage_type_id,
      ],
    );

    const warehouse = warehouseRes.rows[0];

    const locRes = await client.query(
      `
      INSERT INTO warehouse_locations
      (warehouse_id, company_id, type, title, is_primary)
      VALUES ($1, $2, 'WAREHOUSE', $3, true)
      RETURNING *
      `,
      [warehouse.id, data.company_id, `${data.name} Main`],
    );

    const location = locRes.rows[0];

    await client.query(
      `
      UPDATE warehouses
      SET primary_location_id = $1
      WHERE id = $2
      `,
      [location.id, warehouse.id],
    );

    await client.query("COMMIT");

    return { warehouse, location };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
