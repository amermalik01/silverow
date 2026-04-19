// lib/bootstrap/currency.ts
import { PoolClient } from "pg";

export async function initializeCurrency(
  client: PoolClient,
  companyId: string
) {
  // Get GBP currency
  const res = await client.query(
    `SELECT id FROM currencies WHERE code = 'GBP' LIMIT 1`
  );

  if (res.rowCount === 0) {
    throw new Error("GBP currency not found in master table");
  }

  const gbpId = res.rows[0].id;

  await client.query(
    `
    INSERT INTO company_currencies
    (company_id, currency_id, exchange_rate, is_base)
    VALUES ($1, $2, 1, true)
    ON CONFLICT DO NOTHING
    `,
    [companyId, gbpId]
  );
}