// lib/bootstrap/sales.ts

import type { PoolClient } from "pg";

type SimpleNameTable =
  | "crm_credit_ratings"
  | "crm_ownership_type"
  | "crm_type"
  | "crm_order_sources"
  | "crm_status";

type ModuleNameTable = "segments" | "classification" | "payment_method";

/**
 * Insert company-specific defaults into a simple name-based table.
 *
 * Table names are restricted to this file's internal union types.
 * NOT EXISTS makes this safe to rerun without requiring a unique constraint.
 */
async function insertSimpleDefaults(
  client: PoolClient,
  table: SimpleNameTable,
  companyId: string,
  names: readonly string[],
): Promise<void> {
  if (names.length === 0) return;

  await client.query(
    `
    INSERT INTO ${table} (
      company_id,
      name
    )
    SELECT
      $1,
      defaults.name
    FROM unnest($2::TEXT[]) AS defaults(name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM ${table} existing
      WHERE existing.company_id = $1
        AND LOWER(TRIM(existing.name)) = LOWER(TRIM(defaults.name))
    )
    `,
    [companyId, names],
  );
}

/**
 * Insert company-specific defaults into tables having module_type.
 */
async function insertModuleDefaults(
  client: PoolClient,
  table: ModuleNameTable,
  companyId: string,
  moduleType: string,
  names: readonly string[],
): Promise<void> {
  if (names.length === 0) return;

  await client.query(
    `
    INSERT INTO ${table} (
      company_id,
      module_type,
      name
    )
    SELECT
      $1,
      $2,
      defaults.name
    FROM unnest($3::TEXT[]) AS defaults(name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM ${table} existing
      WHERE existing.company_id = $1
        AND existing.module_type = $2
        AND LOWER(TRIM(existing.name)) = LOWER(TRIM(defaults.name))
    )
    `,
    [companyId, moduleType, names],
  );
}

/**
 * Initialize sales and CRM master data for a company.
 *
 * Run this during company initialization after the company has been created.
 */
export async function initializeSalesDefaults(
  client: PoolClient,
  companyId: string,
): Promise<void> {
  // ---------------------------------------------------------
  // 1. CRM credit ratings
  // ---------------------------------------------------------
  await insertSimpleDefaults(client, "crm_credit_ratings", companyId, [
    "Excellent",
    "Good",
    "Poor",
  ]);

  // ---------------------------------------------------------
  // 2. CRM ownership types
  // ---------------------------------------------------------
  await insertSimpleDefaults(client, "crm_ownership_type", companyId, [
    "Sole Trader",
    "Partnership",
    "Limited Company (Ltd)",
    "Public Limited Company (PLC)",
    "Limited Liability Partnership (LLP)",
    "NGO & Charities",
  ]);

  // ---------------------------------------------------------
  // 3. CRM types
  // ---------------------------------------------------------
  await insertSimpleDefaults(client, "crm_type", companyId, [
    "Standard",
    "Route To Market",
    "Indirect",
  ]);

  // ---------------------------------------------------------
  // 4. Sales segments
  // ---------------------------------------------------------
  await insertModuleDefaults(client, "segments", companyId, "sales", [
    "Boat Dealer",
    "Caravan Dealer",
    "Competitor",
    "Cycle Hire",
    "Cycle Shops",
    "e-Bikes (only)",
    "Online Retailer",
    "Other",
    "Repair Service",
    "Scooters",
  ]);

  // ---------------------------------------------------------
  // 5. Sales classifications
  // ---------------------------------------------------------
  await insertModuleDefaults(client, "classification", companyId, "sales", [
    "Lead",
    "Indirect Customer",
    "Prospect",
    "Not Relevant",
    "Customer",
    "Previous Customer",
    "Dissolved/Liquidated",
  ]);

  // ---------------------------------------------------------
  // 6. CRM order sources
  // ---------------------------------------------------------
  await insertSimpleDefaults(client, "crm_order_sources", companyId, [
    "Google",
    "Facebook",
    "Youtube",
  ]);

  // ---------------------------------------------------------
  // 7. CRM statuses
  // ---------------------------------------------------------
  await insertSimpleDefaults(client, "crm_status", companyId, [
    "Email Sent",
    "Follow up",
    "No Email",
    "Not Now/Maybe Later",
    "Opportunity",
    "Unverified",
    "Website Emailed",
  ]);

  // ---------------------------------------------------------
  // 8. Sales payment terms
  // ---------------------------------------------------------
  await client.query(
    `
    INSERT INTO payment_terms (
      company_id,
      module_type,
      name,
      days
    )
    SELECT
      $1,
      'sales',
      defaults.name,
      defaults.days
    FROM (
      VALUES
        ('Immediate', 0),
        ('Sales or Return', 0),
        ('18Days', 18),
        ('30Days', 30),
        ('60Days', 60),
        ('90Days', 90)
    ) AS defaults(name, days)
    WHERE NOT EXISTS (
      SELECT 1
      FROM payment_terms existing
      WHERE existing.company_id = $1
        AND existing.module_type = 'sales'
        AND LOWER(TRIM(existing.name)) = LOWER(TRIM(defaults.name))
    )
    `,
    [companyId],
  );

  // ---------------------------------------------------------
  // 9. Sales payment methods
  // ---------------------------------------------------------
  await insertModuleDefaults(client, "payment_method", companyId, "sales", [
    "PayPal",
    "Klarna",
    "Credit Card/Debit",
    "Bacs (Bank Transfer)",
  ]);

  // ---------------------------------------------------------
  // 10. Sales order and credit note stages
  // ---------------------------------------------------------
  await client.query(
    `
    INSERT INTO common_order_stages (
      company_id,
      stage_type,
      name,
      rank
    )
    SELECT
      $1,
      defaults.stage_type,
      defaults.name,
      defaults.rank
    FROM (
      VALUES
        ('sales_order', 'Order Processing', 10),
        ('sales_order', 'Payment Checked by Finance', 20),
        ('sales_order', 'WH Instructed', 30),
        ('sales_order', 'Out for Delivery', 40),
        ('sales_order', 'Ready to Invoice', 50),
        ('sales_order', 'Delivered', 60),
        ('sales_order', 'On Hold', 70),

        ('credit_note', 'Return Raised', 10),
        ('credit_note', 'Courier Booked', 20),
        ('credit_note', 'Stock Received', 30),
        ('credit_note', 'Evaluation Stage', 40),
        ('credit_note', 'Refund Confirmed', 50),
        ('credit_note', 'Post', 60)
    ) AS defaults(stage_type, name, rank)
    WHERE NOT EXISTS (
      SELECT 1
      FROM common_order_stages existing
      WHERE existing.company_id = $1
        AND existing.stage_type = defaults.stage_type
        AND LOWER(TRIM(existing.name)) = LOWER(TRIM(defaults.name))
    )
    `,
    [companyId],
  );
}
