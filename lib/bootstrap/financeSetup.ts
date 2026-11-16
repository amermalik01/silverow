// lib/bootstrap/financeSetup.ts

import { PoolClient } from "pg";

export async function initializeFinanceSetup(
  client: PoolClient,
  companyId: string,
): Promise<void> {
  await client.query(
    `
    INSERT INTO company_finance_setup (
      company_id,
      vat_payable_receivable_account_id,
      vat_deferred_account_id,
      opening_balance_stock_account_id,
      opening_balance_equity_account_id,
      inventory_adjustment_account_id,
      updated_at
    )
    VALUES (
      $1,

      (
        SELECT id FROM chart_of_accounts
        WHERE company_id = $1 AND code = '2740'
      ),

      NULL,

      (
        SELECT id FROM chart_of_accounts
        WHERE company_id = $1 AND code = '1600'
      ),

      (
        SELECT id FROM chart_of_accounts
        WHERE company_id = $1 AND code = '3530'
      ),

      NULL,

      NOW()
    )
    ON CONFLICT (company_id) DO NOTHING
    `,
    [companyId],
  );

  const validation = await client.query(
    `
    SELECT *
    FROM company_finance_setup
    WHERE company_id = $1
      AND (
        vat_payable_receivable_account_id IS NULL
        OR opening_balance_stock_account_id IS NULL
        OR opening_balance_equity_account_id IS NULL
      )
    `,
    [companyId],
  );

  if (validation.rowCount && validation.rowCount > 0) {
    throw new Error("Required finance setup accounts could not be resolved.");
  }
}

/* import { PoolClient } from "pg";

export async function initializeFinanceSetup(
  client: PoolClient,
  companyId: string,
): Promise<void> {
  await client.query(
    `
    INSERT INTO company_finance_setup (
      company_id,
      vat_payable_receivable_account_id,
      vat_deferred_account_id,
      opening_balance_stock_account_id,
      opening_balance_equity_account_id,
      inventory_adjustment_account_id,
      updated_at
    )
    SELECT
      $1,
      MAX(id) FILTER (WHERE code = '2740'),
      NULL,
      MAX(id) FILTER (WHERE code = '1600'),
      MAX(id) FILTER (WHERE code = '3530'),
      NULL,
      NOW()

    FROM chart_of_accounts
    WHERE company_id = $1
    ON CONFLICT (company_id) DO NOTHING
    `,
    [companyId],
  );

  // Ensure the essential finance accounts exist.
  const validation = await client.query(
    `
    SELECT
      setup.company_id
    FROM company_finance_setup setup
    WHERE setup.company_id = $1
      AND (
        setup.vat_payable_receivable_account_id IS NULL
        OR setup.opening_balance_stock_account_id IS NULL
        OR setup.opening_balance_equity_account_id IS NULL
      )
    `,
    [companyId],
  );

  if (validation.rowCount && validation.rowCount > 0) {
    throw new Error("Required finance setup accounts could not be resolved.");
  }
} */
