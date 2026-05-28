// lib/bootstrap/vat.ts

import { PoolClient } from "pg";

export async function initializeVat(
  client: PoolClient,
  companyId: string
) {
  // 1. Seed the default VAT rates for this company
  const vatRatesResult = await client.query(`
    SELECT name, rate
    FROM default_vat_rates
  `);

  for (const vat of vatRatesResult.rows) {
    await client.query(
      `
      INSERT INTO vat_rates (company_id, name, rate)
      VALUES ($1, $2, $3)
      ON CONFLICT (company_id, name) DO NOTHING
      `,
      [companyId, vat.name, vat.rate]
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
    -- Resolve the company's Business Group UUID
    JOIN vat_business_posting_groups vbg 
      ON vbg.company_id = $1 AND vbg.name = d.vat_business_group_name
    -- Resolve the company's Product Group UUID
    JOIN vat_product_posting_groups vpg 
      ON vpg.company_id = $1 AND vpg.name = d.vat_product_group_name
    -- Resolve the Chart of Accounts ID matching the sales_account_code template (e.g., '2705')
    LEFT JOIN chart_of_accounts coa_sales 
      ON coa_sales.company_id = $1 AND coa_sales.code = d.sales_account_code
    -- Resolve the Chart of Accounts ID matching the purchase_account_code template (e.g., '2710')
    LEFT JOIN chart_of_accounts coa_purch 
      ON coa_purch.company_id = $1 AND coa_purch.code = d.purchase_account_code
    ON CONFLICT (company_id, vat_business_group_id, vat_product_group_id) DO NOTHING
    `,
    [companyId]
  );
}

/* import { PoolClient } from "pg";

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
} */