// lib/bootstrap/chartOfAccounts.ts

import { PoolClient } from "pg";

interface CompanyInventoryConfig {
  inventory_system: "PERIODIC" | "PERPETUAL";
}

export async function initializeChartOfAccounts(
  client: PoolClient,
  companyId: string,
): Promise<void> {
  // 1. Get the inventory system configured for this company.
  const companyResult = await client.query<CompanyInventoryConfig>(
    `
    SELECT inventory_system::text AS inventory_system
    FROM companies
    WHERE id = $1
    LIMIT 1
    `,
    [companyId],
  );

  if (companyResult.rowCount !== 1) {
    throw new Error(
      `Company ${companyId} not found while initializing chart of accounts.`,
    );
  }

  const inventorySystem = companyResult.rows[0].inventory_system;

  if (inventorySystem !== "PERIODIC" && inventorySystem !== "PERPETUAL") {
    throw new Error(`Unsupported inventory system: ${inventorySystem}`);
  }

  // 2. Verify that the selected template exists.
  const templateCheck = await client.query<{ total: string }>(
    `
    SELECT COUNT(*)::text AS total
    FROM template_chart_of_accounts
    WHERE inventory_system = $1
    `,
    [inventorySystem],
  );

  if (Number(templateCheck.rows[0].total) === 0) {
    throw new Error(
      `No chart of accounts template found for ${inventorySystem}.`,
    );
  }

  // 3. Insert all company accounts.
  //
  // VAT IDs are resolved against the newly created company's
  // VAT rates using the template's reference ID.
  //
  // Parent IDs are resolved in the next step.

  await client.query(
    `
    INSERT INTO chart_of_accounts (
      company_id,
      code,
      name,
      account_type,
      gl_account_type,
      vat_rate_id,
      range_start_code,
      range_end_code,
      is_summary,
      is_posting,
      is_active,
      status,
      description
    )
    SELECT
      $1::uuid,
      t.code,
      t.name,
      t.account_type::account_type_enum,
      t.gl_account_type::gl_account_type_enum,
      vr.id,
      t.range_start_code,
      t.range_end_code,

      CASE
        WHEN t.gl_account_type IN (
          'Category',
          'Sub-Category',
          'Heading',
          'End Total'
        ) THEN true
        ELSE false
      END,

      CASE
        WHEN t.gl_account_type = 'Posting' THEN true
        ELSE false
      END,

      true,
      'Active',
      NULL

    FROM template_chart_of_accounts t

    LEFT JOIN vat_rates vr
      ON vr.company_id = $1
      AND vr.ref_id = t.vat_rate_id

    WHERE t.inventory_system = $2

    ON CONFLICT (company_id, code) DO NOTHING
    `,
    [companyId, inventorySystem],
  );

  // 4. Resolve parent relationships.
  //
  // Template parent_code is converted into the actual UUID
  // of the parent account belonging to this company.

  await client.query(
    `
    UPDATE chart_of_accounts child

    SET
      parent_id = parent.id,
      updated_at = NOW()

    FROM template_chart_of_accounts template

    LEFT JOIN chart_of_accounts parent
      ON parent.company_id = $1
      AND parent.code = template.parent_code

    WHERE child.company_id = $1
      AND child.code = template.code
      AND template.inventory_system = $2
    `,
    [companyId, inventorySystem],
  );

  // 5. Validate the resulting account hierarchy.
  const hierarchyCheck = await client.query(
    `
    SELECT
      t.code,
      t.parent_code

    FROM template_chart_of_accounts t

    LEFT JOIN chart_of_accounts child
      ON child.company_id = $1
      AND child.code = t.code

    LEFT JOIN chart_of_accounts parent
      ON parent.company_id = $1
      AND parent.code = t.parent_code

    WHERE t.inventory_system = $2
      AND (
        child.id IS NULL
        OR (
          t.parent_code IS NOT NULL
          AND parent.id IS NULL
        )
        OR (
          t.parent_code IS NOT NULL
          AND child.parent_id IS DISTINCT FROM parent.id
        )
      )

    LIMIT 10
    `,
    [companyId, inventorySystem],
  );

  if (hierarchyCheck.rowCount && hierarchyCheck.rowCount > 0) {
    throw new Error(
      `Chart of accounts hierarchy validation failed: ${JSON.stringify(
        hierarchyCheck.rows,
      )}`,
    );
  }

  // 6. Validate VAT references.
  const vatCheck = await client.query(
    `
    SELECT
      t.code,
      t.vat_rate_id

    FROM template_chart_of_accounts t

    LEFT JOIN vat_rates vr
      ON vr.company_id = $1
      AND vr.ref_id = t.vat_rate_id

    WHERE t.inventory_system = $2
      AND t.vat_rate_id IS NOT NULL
      AND vr.id IS NULL

    LIMIT 10
    `,
    [companyId, inventorySystem],
  );

  if (vatCheck.rowCount && vatCheck.rowCount > 0) {
    throw new Error(
      `Chart of accounts VAT mapping failed: ${JSON.stringify(vatCheck.rows)}`,
    );
  }
}

/* import { PoolClient } from "pg";

export async function initializeChartOfAccounts(
  client: PoolClient,
  companyId: string
) {
  const result = await client.query(`
    SELECT code, name, account_type AS type
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
} */
