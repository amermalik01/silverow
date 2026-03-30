// lib/bootstrap/vat.ts

import { PoolClient } from "pg";

export async function initializeVat(
  client: PoolClient,
  companyId: string
) {
  const result = await client.query(`
    SELECT name, rate
    FROM default_vat_rates
  `);

  for (const vat of result.rows) {
    await client.query(
      `
      INSERT INTO vat_rates (company_id, name, rate)
      VALUES ($1, $2, $3)
      ON CONFLICT DO NOTHING
      `,
      [companyId, vat.name, vat.rate]
    );
  }
}