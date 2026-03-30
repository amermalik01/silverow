// lib/bootstrap/postingGroups.ts

import { PoolClient } from "pg";

export async function initializePostingGroups(
  client: PoolClient,
  companyId: string
) {
  const result = await client.query(`
    SELECT name
    FROM default_posting_groups
  `);

  for (const row of result.rows) {
    await client.query(
      `
      INSERT INTO posting_groups (company_id, name)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [companyId, row.name]
    );
  }
}