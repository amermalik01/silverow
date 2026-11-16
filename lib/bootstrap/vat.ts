// lib/bootstrap/vat.ts

import { PoolClient } from "pg";

/**
 * Step 1:
 * Initialize company VAT rates and VAT posting groups.
 *
 * Must run BEFORE initializeChartOfAccounts().
 */
export async function initializeVatMasterData(
  client: PoolClient,
  companyId: string,
): Promise<void> {
  // 1. Initialize VAT rates.
  await client.query(
    `
    INSERT INTO vat_rates (
      company_id,
      name,
      rate,
      ref_id
    )
    SELECT
      $1,
      d.vat_name,
      d.vat_value,
      d.ref_id

    FROM default_vat_rates d

    ON CONFLICT (company_id, name) DO NOTHING
    `,
    [companyId],
  );

  // 2. Initialize VAT business posting groups.
  await client.query(
    `
    INSERT INTO vat_business_posting_groups (
      company_id,
      name
    )
    SELECT
      $1,
      d.name

    FROM default_vat_business_posting_groups d

    ON CONFLICT (company_id, name) DO NOTHING
    `,
    [companyId],
  );

  // 3. Initialize VAT product posting groups.
  await client.query(
    `
    INSERT INTO vat_product_posting_groups (
      company_id,
      name
    )
    SELECT
      $1,
      d.name

    FROM default_vat_product_posting_groups d

    ON CONFLICT (company_id, name) DO NOTHING
    `,
    [companyId],
  );
}

/**
 * Step 2:
 * Initialize the VAT posting setup matrix.
 *
 * Must run AFTER initializeChartOfAccounts().
 */
export async function initializeVatPostingSetup(
  client: PoolClient,
  companyId: string,
): Promise<void> {
  await client.query(
    `
    INSERT INTO vat_posting_setup (
      company_id,
      vat_business_group_id,
      vat_product_group_id,
      vat_rate,
      sales_vat_account_id,
      purchase_vat_account_id
    )
    SELECT
      $1,
      vbg.id,
      vpg.id,
      d.vat_rate,
      coa_sales.id,
      coa_purch.id

    FROM default_vat_posting_setup d

    JOIN vat_business_posting_groups vbg
      ON vbg.company_id = $1
      AND vbg.name = d.vat_business_group_name

    JOIN vat_product_posting_groups vpg
      ON vpg.company_id = $1
      AND vpg.name = d.vat_product_group_name

    LEFT JOIN chart_of_accounts coa_sales
      ON coa_sales.company_id = $1
      AND coa_sales.code = d.sales_account_code

    LEFT JOIN chart_of_accounts coa_purch
      ON coa_purch.company_id = $1
      AND coa_purch.code = d.purchase_account_code

    ON CONFLICT (
      company_id,
      vat_business_group_id,
      vat_product_group_id
    ) DO NOTHING
    `,
    [companyId],
  );

  // Validate that all configured VAT accounts were resolved.
  const validation = await client.query(
    `
    SELECT
      d.vat_business_group_name,
      d.vat_product_group_name,
      d.sales_account_code,
      d.purchase_account_code

    FROM default_vat_posting_setup d

    LEFT JOIN chart_of_accounts sales
      ON sales.company_id = $1
      AND sales.code = d.sales_account_code

    LEFT JOIN chart_of_accounts purchases
      ON purchases.company_id = $1
      AND purchases.code = d.purchase_account_code

    WHERE
      (d.sales_account_code IS NOT NULL AND sales.id IS NULL)
      OR
      (d.purchase_account_code IS NOT NULL AND purchases.id IS NULL)

    LIMIT 10
    `,
    [companyId],
  );

  if (validation.rowCount && validation.rowCount > 0) {
    throw new Error(
      `VAT posting account mapping failed: ${
        JSON.stringify(validation.rows)
      }`,
    );
  }
}


/* import { PoolClient } from "pg";

export async function initializeVat(
  client: PoolClient,
  companyId: string
) {
  // 1. Seed the default VAT rates for this company
  const vatRatesResult = await client.query(`
    SELECT ref_id,vat_name, vat_value
    FROM default_vat_rates
  `);  

  for (const vat of vatRatesResult.rows) {
    await client.query(
      `
      INSERT INTO vat_rates (company_id, name, rate, ref_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (company_id, name) DO NOTHING
      `,
      [companyId, vat.vat_name, vat.vat_value, vat.ref_id]
    );
  }

  // 2. Seed the VAT Business Posting Groups
  const bizGroupsResult = await client.query(`
    SELECT name FROM default_vat_business_posting_groups
  `);
  
  for (const biz of bizGroupsResult.rows) {
    await client.query(
      `
      INSERT INTO vat_business_posting_groups (company_id, name)
      VALUES ($1, $2)
      ON CONFLICT (company_id, name) DO NOTHING
      `,
      [companyId, biz.name]
    );
  }

  // 3. Seed the VAT Product Posting Groups
  const prodGroupsResult = await client.query(`
    SELECT name FROM default_vat_product_posting_groups
  `);

  for (const prod of prodGroupsResult.rows) {
    await client.query(
      `
      INSERT INTO vat_product_posting_groups (company_id, name)
      VALUES ($1, $2)
      ON CONFLICT (company_id, name) DO NOTHING
      `,
      [companyId, prod.name]
    );
  }

  // 4. Seed the complete Mapped VAT Posting Setup Matrix
  // This relational query maps textual configurations back to newly created UUIDs dynamically
  await client.query(
    `
    INSERT INTO vat_posting_setup (
      company_id, 
      vat_business_group_id, 
      vat_product_group_id, 
      vat_rate, 
      sales_vat_account_id, 
      purchase_vat_account_id
    )
    SELECT 
      $1 AS company_id,
      vbg.id AS vat_business_group_id,
      vpg.id AS vat_product_group_id,
      d.vat_rate,
      coa_sales.id AS sales_vat_account_id,
      coa_purch.id AS purchase_vat_account_id
    FROM default_vat_posting_setup d
    JOIN vat_business_posting_groups vbg 
      ON vbg.company_id = $1 AND vbg.name = d.vat_business_group_name
    JOIN vat_product_posting_groups vpg 
      ON vpg.company_id = $1 AND vpg.name = d.vat_product_group_name
    LEFT JOIN chart_of_accounts coa_sales 
      ON coa_sales.company_id = $1 AND coa_sales.code = d.sales_account_code
    LEFT JOIN chart_of_accounts coa_purch 
      ON coa_purch.company_id = $1 AND coa_purch.code = d.purchase_account_code
    ON CONFLICT (company_id, vat_business_group_id, vat_product_group_id) DO NOTHING
    `,
    [companyId]
  );
} */