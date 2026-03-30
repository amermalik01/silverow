// lib/bootstrap/chartOfAccounts.ts

import { PoolClient } from "pg";

export async function initializeChartOfAccounts(
  client: PoolClient,
  companyId: string
) {
  const result = await client.query(`
    SELECT code, name, type
    FROM default_chart_of_accounts
    ORDER BY code
  `);

  for (const acc of result.rows) {
    await client.query(
      `
      INSERT INTO chart_of_accounts
      (company_id, code, name, type)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT DO NOTHING
      `,
      [companyId, acc.code, acc.name, acc.type]
    );
  }
}