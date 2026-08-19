// lib/bootstrap/currencySetup.ts
import { PoolClient } from "pg";

export async function initializeCurrencyMovementSetup(
  client: PoolClient,
  companyId: string,
) {
  // Target account code (e.g., '8800' for Exchange Rate Gain/Loss)
  const defaultAccountCode = "8800";

  // Resolve account UUID from the company's freshly seeded Chart of Accounts
  const accountRes = await client.query(
    `SELECT id FROM chart_of_accounts WHERE company_id = $1 AND code = $2 LIMIT 1`,
    [companyId, defaultAccountCode],
  );

  const defaultAccountId =
    accountRes.rows.length > 0 ? accountRes.rows[0].id : null;

  await client.query(
    `
    INSERT INTO currency_movement_setup (
      company_id,
      realised_gain_gl_id,
      realised_loss_gl_id,
      unrealised_gain_gl_id,
      unrealised_loss_gl_id
    )
    VALUES ($1, $2, $2, $2, $2)
    ON CONFLICT (company_id) DO NOTHING
    `,
    [companyId, defaultAccountId],
  );
}
