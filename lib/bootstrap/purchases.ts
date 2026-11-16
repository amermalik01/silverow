// lib/bootstrap/purchases.ts

import type { PoolClient } from "pg";

type ModuleNameTable = "segments" | "classification" | "payment_method";

/**
 * Insert company-specific defaults into tables having module_type.
 *
 * Table names are restricted to this file's internal union types.
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
 * Initialize purchase master data for a company.
 */
export async function initializePurchaseDefaults(
  client: PoolClient,
  companyId: string,
): Promise<void> {
  // ---------------------------------------------------------
  // 1. Purchase segments
  // ---------------------------------------------------------
  await insertModuleDefaults(client, "segments", companyId, "purchases", [
    "Container Shipment",
    "Courier",
    "Manufacturer",
    "Marketing",
    "Repair Partner",
    "Truck/Pallet Transport",
  ]);

  // ---------------------------------------------------------
  // 2. Purchase classifications
  // ---------------------------------------------------------
  await insertModuleDefaults(client, "classification", companyId, "purchases", [
    "Potential Supplier",
    "Previous Supplier",
    "Supplier",
    "Dissolved/Liquidated",
  ]);

  // ---------------------------------------------------------
  // 3. Purchase payment terms
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
      'purchases',
      defaults.name,
      defaults.days
    FROM (
      VALUES
        ('Immediate', 0),
        ('7Days', 7),
        ('14Days', 14),
        ('28Days', 28),
        ('30Days', 30),
        ('60Days', 60)
    ) AS defaults(name, days)
    WHERE NOT EXISTS (
      SELECT 1
      FROM payment_terms existing
      WHERE existing.company_id = $1
        AND existing.module_type = 'purchases'
        AND LOWER(TRIM(existing.name)) = LOWER(TRIM(defaults.name))
    )
    `,
    [companyId],
  );

  // ---------------------------------------------------------
  // 4. Purchase payment methods
  // ---------------------------------------------------------
  await insertModuleDefaults(client, "payment_method", companyId, "purchases", [
    "CreditCard/Debit",
    "Bacs",
  ]);

  // ---------------------------------------------------------
  // 5. Purchase order and debit note stages
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
        ('purchase_order', 'PO Sent', 10),
        ('purchase_order', 'In Production', 20),
        ('purchase_order', 'In Transit', 30),
        ('purchase_order', 'Completed', 40),

        ('debit_note', 'Stage 1', 10),
        ('debit_note', 'Stage 2', 20),
        ('debit_note', 'Stage 3', 30),
        ('debit_note', 'Stage 4', 40),
        ('debit_note', 'Stage 5', 50),
        ('debit_note', 'Stage 6', 60)
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
