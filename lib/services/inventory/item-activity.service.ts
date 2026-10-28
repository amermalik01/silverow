// lib/services/inventory/item-activity.service.ts

import type { PoolClient, QueryResultRow } from "pg";
import { pool } from "@/lib/db";

type NumericValue = string | number | null;

export interface ItemStockSummary {
  totalPhysical: number;
  totalReserved: number;
  totalAvailable: number;
}

export interface ItemWarehouseStock {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string | null;
  location_id: string | null;
  location_title: string | null;
  location_code: string | null;
  batch_no: string | null;
  serial_no: string | null;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  average_cost: number;
  expiry_date: string | null;
  last_movement_at: string | null;
}

export interface ItemMovement {
  id: string;
  doc_id: string;
  transaction_no: string;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
  reference_line_id: string | null;
  posting_date: string;
  status: string;
  warehouse_id: string;
  warehouse_name: string;
  location_id: string | null;
  location_name: string | null;
  bin_code: string | null;
  quantity: number;
  remaining_quantity: number;
  movement_direction: "IN" | "OUT";
  unit_cost: number;
  total_cost: number;
  batch_no: string | null;
  serial_no: string | null;
  expiry_date: string | null;
  created_at: string;
}

export interface ItemAllocation {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_location_id: string | null;
  location_name: string | null;
  batch_no: string | null;
  bin_code: string | null;
  expiry_date: string | null;
  date_received: string | null;
  prod_date: string | null;
  allocated_quantity: number;
  unit_cost: number;
  total_cost: number;
  allocation_method: string | null;
  status: string;
  created_at: string;
  outbound_entry_id: string | null;
  outbound_line_id: string | null;
  inbound_entry_id: string | null;
  source_allocation_id: string | null;
  purchase_order_line_id: string | null;
  purchase_invoice_line_id: string | null;
  debit_note_line_id: string | null;
  sales_order_line_id: string | null;
  credit_note_line_id: string | null;
  journal_line_id: string | null;
  allocation_category: "RESERVATION" | "CONSUMPTION" | "OTHER";
}

export interface ItemActivityResult {
  summary: ItemStockSummary;
  warehouseStock: ItemWarehouseStock[];
  transactions: ItemMovement[];
  allocations: ItemAllocation[];
}

interface StockRow extends QueryResultRow {
  warehouse_id: string;
  warehouse_name: string;
  warehouse_code: string | null;
  location_id: string | null;
  location_title: string | null;
  location_code: string | null;
  batch_no: string | null;
  serial_no: string | null;
  quantity: NumericValue;
  reserved_quantity: NumericValue;
  available_quantity: NumericValue;
  average_cost: NumericValue;
  expiry_date: string | null;
  last_movement_at: string | null;
}

interface MovementRow extends QueryResultRow {
  id: string;
  doc_id: string;
  transaction_no: string;
  transaction_type: string;
  reference_type: string | null;
  reference_id: string | null;
  reference_line_id: string | null;
  posting_date: string;
  status: string;
  warehouse_id: string;
  warehouse_name: string;
  location_id: string | null;
  location_name: string | null;
  bin_code: string | null;
  quantity: NumericValue;
  remaining_quantity: NumericValue;
  movement_direction: "IN" | "OUT";
  unit_cost: NumericValue;
  total_cost: NumericValue;
  batch_no: string | null;
  serial_no: string | null;
  expiry_date: string | null;
  created_at: string;
}

interface AllocationRow extends QueryResultRow {
  id: string;
  warehouse_id: string;
  warehouse_name: string;
  warehouse_location_id: string | null;
  location_name: string | null;
  batch_no: string | null;
  bin_code: string | null;
  expiry_date: string | null;
  date_received: string | null;
  prod_date: string | null;
  allocated_quantity: NumericValue;
  unit_cost: NumericValue;
  total_cost: NumericValue;
  allocation_method: string | null;
  status: string;
  created_at: string;
  outbound_entry_id: string | null;
  outbound_line_id: string | null;
  inbound_entry_id: string | null;
  source_allocation_id: string | null;
  purchase_order_line_id: string | null;
  purchase_invoice_line_id: string | null;
  debit_note_line_id: string | null;
  sales_order_line_id: string | null;
  credit_note_line_id: string | null;
  journal_line_id: string | null;
  allocation_category: "RESERVATION" | "CONSUMPTION" | "OTHER";
}

const toNumber = (value: NumericValue): number => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

/**
 * Physical stock is calculated from unconsumed
 * inbound inventory ledger layers.
 *
 * Reservations are currently defined as ACTIVE
 * sales-order allocations without a posted
 * outbound ledger entry.
 *
 * Important:
 * This assumes the sales-order allocation lifecycle
 * releases or updates reservations when dispatched.
 */
const warehouseStockQuery = `
  WITH physical_layers AS (
    SELECT
      ile.warehouse_id,
      ile.location_id,
      ile.batch_no,
      ile.serial_no,
      ile.expiry_date,
      ile.created_at,
      ile.remaining_quantity,
      ile.unit_cost
    FROM inventory_ledger_entries ile
    WHERE ile.company_id = $1
      AND ile.item_id = $2
      AND ile.direction = 'IN'
      AND ile.status = 'OPEN'
      AND ile.remaining_quantity > 0
  ),

  physical_stock AS (
    SELECT
      pl.warehouse_id,
      pl.location_id,
      pl.batch_no,
      pl.serial_no,
      SUM(pl.remaining_quantity) AS physical_qty,
      SUM(
        pl.remaining_quantity * pl.unit_cost
      ) AS stock_value,
      MAX(pl.expiry_date) AS expiry_date,
      MAX(pl.created_at) AS last_movement_at
    FROM physical_layers pl
    GROUP BY
      pl.warehouse_id,
      pl.location_id,
      pl.batch_no,
      pl.serial_no
  ),

  reservations AS (
    SELECT
      ia.warehouse_id,
      ia.warehouse_location_id AS location_id,
      ia.batch_no,
      SUM(ia.allocated_quantity) AS reserved_qty
    FROM inventory_allocations ia
    WHERE ia.company_id = $1
      AND ia.item_id = $2
      AND ia.status = 'ACTIVE'
      AND ia.outbound_entry_id IS NULL
      AND ia.sales_order_line_id IS NOT NULL
      AND ia.allocated_quantity > 0
    GROUP BY
      ia.warehouse_id,
      ia.warehouse_location_id,
      ia.batch_no
  ),

  physical_warehouse AS (
    SELECT
      warehouse_id,
      SUM(physical_qty) AS physical_qty,
      SUM(stock_value) AS stock_value,
      MAX(expiry_date) AS expiry_date,
      MAX(last_movement_at) AS last_movement_at
    FROM physical_stock
    GROUP BY warehouse_id
  ),

  reserved_warehouse AS (
    SELECT
      warehouse_id,
      SUM(reserved_qty) AS reserved_qty
    FROM reservations
    GROUP BY warehouse_id
  )

  SELECT
    w.id AS warehouse_id,
    w.name AS warehouse_name,
    w.code AS warehouse_code,

    NULL::uuid AS location_id,
    NULL::text AS location_title,
    NULL::text AS location_code,
    NULL::text AS batch_no,
    NULL::text AS serial_no,

    COALESCE(pw.physical_qty, 0) AS quantity,
    COALESCE(rw.reserved_qty, 0) AS reserved_quantity,

    COALESCE(pw.physical_qty, 0)
      - COALESCE(rw.reserved_qty, 0)
      AS available_quantity,

    CASE
      WHEN COALESCE(pw.physical_qty, 0) > 0
      THEN pw.stock_value / pw.physical_qty
      ELSE 0
    END AS average_cost,

    pw.expiry_date,
    pw.last_movement_at

  FROM warehouses w

  LEFT JOIN physical_warehouse pw
    ON pw.warehouse_id = w.id

  LEFT JOIN reserved_warehouse rw
    ON rw.warehouse_id = w.id

  WHERE
    pw.warehouse_id IS NOT NULL
    OR rw.warehouse_id IS NOT NULL

  ORDER BY w.name ASC
`;

/**
 * Full posted inventory movement history.
 *
 * Both inbound and outbound entries are returned.
 * The original transaction type and references
 * are preserved for document traceability.
 */

const transactionsQuery = `
  WITH base_ledger AS (
    SELECT
      ile.id,
      ile.transaction_type,
      ile.reference_type,
      ile.reference_id,
      ile.reference_line_id,
      ile.posting_date,
      ile.status,
      ile.warehouse_id,
      ile.location_id,
      ile.bin_code,
      ile.quantity,
      ile.remaining_quantity,
      ile.direction,
      ile.unit_cost,
      ile.total_cost,
      ile.batch_no,
      ile.serial_no,
      ile.expiry_date,
      ile.created_at,
      w.name AS warehouse_name,
      wl.title AS location_name
    FROM inventory_ledger_entries ile
    JOIN warehouses w
      ON w.id = ile.warehouse_id
    LEFT JOIN warehouse_locations wl
      ON wl.id = ile.location_id
    WHERE ile.company_id = $1
      AND ile.item_id = $2
      AND ile.status <> 'CANCELLED'
    ORDER BY
      ile.posting_date DESC,
      ile.created_at DESC,
      ile.id DESC
    LIMIT 200
  )
  SELECT
    bl.id,

    COALESCE(
      pi_from_po_pr.invoice_no,
      po_from_pr.order_no,
      jnl.entry_no,
      so_from_sd2.sales_invoice_no,
      so_from_sd2.order_no,
      cn_from_sd1.posted_credit_note_no,
      cn_from_sd1.credit_note_no,
      dn_from_sd.debit_note_invoice_no,
      dn_from_sd.debit_note_no,
      st.transfer_no,
      '-'::text
    ) AS transaction_no,

    COALESCE(
      pi_from_po_pr.id::text,
      po_from_pr.id::text,
      jnl.id::text,
      so_from_sd2.id::text,
      so_from_sd2.id::text,
      cn_from_sd1.id::text,
      cn_from_sd1.id::text,
      dn_from_sd.id::text,
      dn_from_sd.id::text,
      st.id::text,
      '-'::text
    ) AS doc_id,

    bl.transaction_type,
    bl.reference_type,
    bl.reference_id,
    bl.reference_line_id,

    TO_CHAR(
      bl.posting_date,
      'YYYY-MM-DD'
    ) AS posting_date,

    bl.status,
    bl.warehouse_id,
    bl.warehouse_name,

    bl.location_id,
    bl.location_name,

    bl.bin_code,
    bl.quantity,
    bl.remaining_quantity,

    bl.direction AS movement_direction,
    bl.unit_cost,
    bl.total_cost,
    bl.batch_no,
    bl.serial_no,

    TO_CHAR(
      bl.expiry_date,
      'YYYY-MM-DD'
    ) AS expiry_date,

    TO_CHAR(
      bl.created_at,
      'YYYY-MM-DD"T"HH24:MI:SS'
    ) AS created_at

  FROM base_ledger bl

  -- Optional reference document joins evaluated ONLY on the top 200 rows
  LEFT JOIN purchase_receipts pr 
    ON bl.reference_type = 'PURCHASE_RECEIPT' AND pr.id = bl.reference_id
  LEFT JOIN purchase_orders po_from_pr 
    ON po_from_pr.id = pr.purchase_order_id
  LEFT JOIN purchase_invoices pi_from_po_pr 
    ON pi_from_po_pr.purchase_order_id = po_from_pr.id

  LEFT JOIN stock_dispatches sd
    ON bl.reference_type = 'STOCK_DISPATCH' AND sd.id = bl.reference_id
  LEFT JOIN debit_notes dn_from_sd 
    ON dn_from_sd.id = sd.debit_note_id

  LEFT JOIN stock_dispatches sd1
    ON bl.reference_type = 'CREDIT_NOTE' AND sd1.id = bl.reference_id
  LEFT JOIN credit_notes cn_from_sd1 
    ON cn_from_sd1.id = sd1.credit_note_id

  LEFT JOIN stock_dispatches sd2
    ON bl.reference_type = 'SALES_SHIPMENT' AND sd2.id = bl.reference_id
  LEFT JOIN sales_orders so_from_sd2 
    ON so_from_sd2.id = sd2.sales_order_id
  
  LEFT JOIN transfer_headers st
    ON bl.reference_type IN ('STOCK_TRANSFER', 'TRANSFER') AND st.id = bl.reference_id

  LEFT JOIN journal_entries jnl
    ON bl.reference_type = 'ITEM_JOURNAL' AND jnl.id = bl.reference_id
`;
// const transactionsQuery = `
//   SELECT
//     ile.id,

//     COALESCE(
//       pi_from_po_pr.invoice_no,
//       po_from_pr.order_no,
//       jnl.entry_no,
//       so_from_sd2.sales_invoice_no,
//       so_from_sd2.order_no,
//       cn_from_sd1.posted_credit_note_no,
//       cn_from_sd1.credit_note_no,
//       dn_from_sd.debit_note_invoice_no,
//       dn_from_sd.debit_note_no,
//       st.transfer_no,
//       '-'::text
//     ) AS transaction_no,

//     ile.transaction_type,
//     ile.reference_type,
//     ile.reference_id,
//     ile.reference_line_id,

//     TO_CHAR(
//       ile.posting_date,
//       'YYYY-MM-DD'
//     ) AS posting_date,

//     ile.status,
//     ile.warehouse_id,
//     w.name AS warehouse_name,

//     ile.location_id,
//     wl.title AS location_name,

//     ile.bin_code,
//     ile.quantity,
//     ile.remaining_quantity,

//     ile.direction AS movement_direction,
//     ile.unit_cost,
//     ile.total_cost,
//     ile.batch_no,
//     ile.serial_no,

//     TO_CHAR(
//       ile.expiry_date,
//       'YYYY-MM-DD'
//     ) AS expiry_date,

//     TO_CHAR(
//       ile.created_at,
//       'YYYY-MM-DD"T"HH24:MI:SS'
//     ) AS created_at

//   FROM inventory_ledger_entries ile

//   JOIN warehouses w
//     ON w.id = ile.warehouse_id

//   LEFT JOIN warehouse_locations wl
//     ON wl.id = ile.location_id

//     -- Optional reference document joins for human-readable numbers
//   LEFT JOIN purchase_receipts pr
//     ON ile.reference_type = 'PURCHASE_RECEIPT' AND pr.id = ile.reference_id
//   LEFT JOIN purchase_orders po_from_pr
//     ON po_from_pr.id = pr.purchase_order_id
//   LEFT JOIN purchase_invoices pi_from_po_pr
//     ON pi_from_po_pr.purchase_order_id = po_from_pr.id

//   LEFT JOIN stock_dispatches sd
//     ON ile.reference_type IN ('STOCK_DISPATCH') AND sd.id = ile.reference_id
//   LEFT JOIN debit_notes dn_from_sd ON  dn_from_sd.id = sd.debit_note_id

//   LEFT JOIN stock_dispatches sd1
//     ON ile.reference_type IN ('CREDIT_NOTE') AND sd1.id = ile.reference_id
//   LEFT JOIN credit_notes cn_from_sd1 ON cn_from_sd1.id = sd1.credit_note_id

// LEFT JOIN stock_dispatches sd2
//     ON ile.reference_type IN ('SALES_SHIPMENT') AND sd2.id = ile.reference_id
//   LEFT JOIN sales_orders so_from_sd2 ON so_from_sd2.id = sd2.sales_order_id

//   LEFT JOIN transfer_headers st
//     ON ile.reference_type IN ('STOCK_TRANSFER', 'TRANSFER') AND st.id = ile.reference_id

//  LEFT JOIN journal_entries jnl
//     ON ile.reference_type IN ('ITEM_JOURNAL') AND jnl.id = ile.reference_id

//   WHERE ile.company_id = $1
//     AND ile.item_id = $2
//     AND ile.status <> 'CANCELLED'

//   ORDER BY
//     ile.posting_date DESC,
//     ile.created_at DESC,
//     ile.id DESC

//   LIMIT 200
// `;

/**
 * Allocation history:
 *
 * RESERVATION:
 *   Unposted active sales-order allocation.
 *
 * CONSUMPTION:
 *   Allocation linked to a posted OUT entry.
 *
 * OTHER:
 *   Inbound/source allocations or allocations
 *   whose lifecycle cannot be determined here.
 */
const allocationsQuery = `
  SELECT
    ia.id,
    ia.warehouse_id,
    w.name AS warehouse_name,

    ia.warehouse_location_id,
    wl.title AS location_name,

    ia.batch_no,
    ia.bin_code,

    TO_CHAR(
      ia.expiry_date,
      'YYYY-MM-DD'
    ) AS expiry_date,

    TO_CHAR(
      ia.date_received,
      'YYYY-MM-DD'
    ) AS date_received,

    TO_CHAR(
      ia.prod_date,
      'YYYY-MM-DD'
    ) AS prod_date,

    ia.allocated_quantity,
    ia.unit_cost,
    ia.total_cost,
    ia.allocation_method,
    ia.status,

    TO_CHAR(
      ia.created_at,
      'YYYY-MM-DD"T"HH24:MI:SS'
    ) AS created_at,

    ia.outbound_entry_id,
    ia.outbound_line_id,
    ia.inbound_entry_id,
    ia.source_allocation_id,

    ia.purchase_order_line_id,
    ia.purchase_invoice_line_id,
    ia.debit_note_line_id,
    ia.sales_order_line_id,
    ia.credit_note_line_id,
    ia.journal_line_id,

    CASE
      WHEN ia.outbound_entry_id IS NOT NULL
        THEN 'CONSUMPTION'

      WHEN ia.status = 'ACTIVE'
        AND ia.outbound_entry_id IS NULL
        AND ia.sales_order_line_id IS NOT NULL
        THEN 'RESERVATION'

      ELSE 'OTHER'
    END AS allocation_category

  FROM inventory_allocations ia

  JOIN warehouses w
    ON w.id = ia.warehouse_id

  LEFT JOIN warehouse_locations wl
    ON wl.id = ia.warehouse_location_id

  WHERE ia.company_id = $1
    AND ia.item_id = $2
    AND ia.outbound_entry_id IS NULL  -- Removes records already taken out / fulfilled
    AND ia.status = 'ACTIVE'         -- Ensures only active/open allocations are returned

  ORDER BY
    ia.created_at DESC,
    ia.id DESC

  LIMIT 200
`;

export class ItemActivityService {
  static async getActivity(
    companyId: string,
    itemId: string,
  ): Promise<ItemActivityResult> {
    const client: PoolClient = await pool.connect();

    try {
      await client.query(
        "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );

      const itemResult = await client.query<{ id: string }>(
        `
          SELECT id
          FROM items
          WHERE id = $1
            AND company_id = $2
          LIMIT 1
        `,
        [itemId, companyId],
      );

      if (itemResult.rowCount === 0) {
        throw new Error("ITEM_NOT_FOUND");
      }

      const params = [companyId, itemId];

      const stockResult = await client.query<StockRow>(
        warehouseStockQuery,
        params,
      );

      // console.log("transactionsQuery === ", transactionsQuery);
      // console.log("params === ", params);

      const transactionResult = await client.query<MovementRow>(
        transactionsQuery,
        params,
      );

      const allocationResult = await client.query<AllocationRow>(
        allocationsQuery,
        params,
      );

      const warehouseStock: ItemWarehouseStock[] = stockResult.rows.map(
        (row) => ({
          ...row,
          quantity: toNumber(row.quantity),
          reserved_quantity: toNumber(row.reserved_quantity),
          available_quantity: toNumber(row.available_quantity),
          average_cost: toNumber(row.average_cost),
        }),
      );

      const transactions: ItemMovement[] = transactionResult.rows.map(
        (row) => ({
          ...row,
          quantity: toNumber(row.quantity),
          remaining_quantity: toNumber(row.remaining_quantity),
          unit_cost: toNumber(row.unit_cost),
          total_cost: toNumber(row.total_cost),
        }),
      );

      const allocations: ItemAllocation[] = allocationResult.rows.map(
        (row) => ({
          ...row,
          allocated_quantity: toNumber(row.allocated_quantity),
          unit_cost: toNumber(row.unit_cost),
          total_cost: toNumber(row.total_cost),
        }),
      );

      const summary: ItemStockSummary = {
        totalPhysical: 0,
        totalReserved: 0,
        totalAvailable: 0,
      };

      for (const row of warehouseStock) {
        summary.totalPhysical += row.quantity;
        summary.totalReserved += row.reserved_quantity;
        summary.totalAvailable += row.available_quantity;
      }

      await client.query("COMMIT");

      return {
        summary,
        warehouseStock,
        transactions,
        allocations,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
