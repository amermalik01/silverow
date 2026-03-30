// lib/bootstrap/sequences.ts

import { PoolClient } from "pg";

export async function initializeSequences(
  client: PoolClient,
  companyId: string
) {
  const modules = await client.query(`
    SELECT name, display_name, default_prefix, default_start, default_padding
    FROM ref_modules
    WHERE status = true
  `);

  for (const mod of modules.rows) {
    await client.query(
      `
      INSERT INTO sequences
      (company_id, module, display_name, prefix, current_value, padding)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (company_id, module) DO NOTHING
      `,
      [
        companyId,
        mod.name,
        mod.display_name,
        mod.default_prefix,
        mod.default_start - 1,
        mod.default_padding,
      ]
    );
  }
}