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

  invoice_no: string | null;
  document_url: string | null;
  invoice_url: string | null;

  posting_date: string;
  status: string;
  warehouse_id: string;
  warehouse_name: string;
  location_id: string | null;
  location_name: string | null;
  bin_code: string | null;
  tracking_code: string | null;
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
  serial_no: string | null;
  tracking_code: string | null;
  expiry_date: string | null;
  date_received: string | null;
  prod_date: string | null;
  allocated_quantity: number;
  unit_cost: number;
  total_cost: number;
  physical_layer_unit_cost: number;
  valuation_unit_cost: number;
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

  invoice_no: string | null;
  document_url: string | null;
  invoice_url: string | null;

  posting_date: string;
  status: string;
  warehouse_id: string;
  warehouse_name: string;
  location_id: string | null;
  location_name: string | null;
  bin_code: string | null;
  tracking_code: string | null;
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
  serial_no: string | null;
  tracking_code: string | null;
  expiry_date: string | null;
  date_received: string | null;
  prod_date: string | null;
  allocated_quantity: NumericValue;
  unit_cost: NumericValue;
  total_cost: NumericValue;
  physical_layer_unit_cost: NumericValue;
  valuation_unit_cost: NumericValue;
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

export type ItemCardActivityType = "total" | "allocated" | "available";

export interface ItemCardActivityResult {
  type: ItemCardActivityType;
  transactions?: ItemMovement[];
  allocations?: ItemAllocation[];
}

const toNumber = (value: NumericValue): number => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

/**
 * Canonical tracking value.
 *
 * serial_no and bin_code are aliases in the current
 * inventory allocation/ledger implementation.
 */
const trackingExpression = `
  COALESCE(
    NULLIF(BTRIM(serial_no), ''),
    NULLIF(BTRIM(bin_code), '')
  )
`;

/**
 * Warehouse stock summary.
 *
 * Physical quantity:
 *   Sum of remaining quantities on inbound ledger layers.
 *
 * Physical value:
 *   Sum of remaining_value, not remaining_quantity * unit_cost.
 *
 * This is important because remaining_value preserves
 * partial-layer valuation and revaluation adjustments.
 *
 * Reservations:
 *   Active sales-order allocations without an outbound entry.
 *
 * Posted consumption is not a reservation.
 */
const warehouseStockQuery = `
  WITH physical_layers AS (
    SELECT
      ile.warehouse_id,
      ile.remaining_quantity,

      COALESCE(
        ile.remaining_value,
        ile.remaining_quantity * ile.unit_cost
      ) AS remaining_value,

      ile.expiry_date,
      ile.created_at

    FROM inventory_ledger_entries ile

    WHERE ile.company_id = $1
      AND ile.item_id = $2
      AND ile.direction = 'IN'
      AND ile.status <> 'CANCELLED'
      AND ile.remaining_quantity > 0
  ),

  physical_stock AS (
    SELECT
      warehouse_id,
      SUM(remaining_quantity) AS physical_qty,
      SUM(remaining_value) AS stock_value,
      MAX(expiry_date) AS expiry_date,
      MAX(created_at) AS last_movement_at

    FROM physical_layers

    GROUP BY warehouse_id
  ),

  /*
   * Current outstanding sales-order reservations.
   *
   * Exclude:
   * - Cancelled allocations
   * - Posted consumption allocations
   * - Allocations that are not sales-order reservations
   * - Deleted sales-order lines
   *
   * quantity_reserved is the remaining reservation quantity
   * maintained on the sales-order line.
   */
  reservation_totals AS (
    SELECT
      ia.company_id,
      ia.item_id,
      sol.id AS sales_order_line_id,

      so.order_no AS sales_order_no,
      CASE
          WHEN so.id IS NOT NULL
              THEN '/sales/invoices/' || so.id::text
          ELSE NULL
      END AS document_url,

      so.sales_invoice_no AS invoice_no,

      CASE
          WHEN so.id IS NOT NULL
              AND NULLIF(BTRIM(so.sales_invoice_no), '') IS NOT NULL
              THEN '/sales/invoices/' || so.id::text
          ELSE NULL
      END AS invoice_url,

      sol.warehouse_id,

      SUM(ia.allocated_quantity) AS allocation_quantity,

      GREATEST(
        COALESCE(sol.quantity_reserved, 0),
        0
      ) AS remaining_reserved_quantity

    FROM inventory_allocations ia

    LEFT JOIN sales_order_lines sol
        ON sol.id = ia.sales_order_line_id
      AND sol.company_id = ia.company_id

    LEFT JOIN sales_orders so
        ON so.id = sol.sales_order_id
      AND so.company_id = sol.company_id

    WHERE ia.company_id = $1
      AND ia.item_id = $2
      AND ia.status = 'ACTIVE'
      AND ia.outbound_entry_id IS NULL
      AND ia.inbound_entry_id IS NULL
      AND ia.source_allocation_id IS NOT NULL
      AND ia.sales_order_line_id IS NOT NULL
      AND COALESCE(sol.is_deleted, false) = false

    GROUP BY
      ia.company_id,
      so.id,
      so.order_no,
      ia.item_id,
      sol.id,
      sol.warehouse_id,
      sol.quantity_reserved
  ),

  reservations AS (
    SELECT
      company_id,
      item_id,
      warehouse_id,

      SUM(
        LEAST(
          allocation_quantity,
          remaining_reserved_quantity
        )
      ) AS reserved_quantity

    FROM reservation_totals

    GROUP BY
      company_id,
      item_id,
      warehouse_id
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

    COALESCE(ps.physical_qty, 0) AS quantity,

    COALESCE(r.reserved_quantity, 0) AS reserved_quantity,

    GREATEST(
      COALESCE(ps.physical_qty, 0)
      - COALESCE(r.reserved_quantity, 0),
      0
    ) AS available_quantity,

    CASE
      WHEN COALESCE(ps.physical_qty, 0) > 0
      THEN
        COALESCE(ps.stock_value, 0)
        / ps.physical_qty
      ELSE 0
    END AS average_cost,

    ps.expiry_date,
    ps.last_movement_at

  FROM warehouses w

  LEFT JOIN physical_stock ps
    ON ps.warehouse_id = w.id

  LEFT JOIN reservations r
    ON r.company_id = w.company_id
   AND r.warehouse_id = w.id

  WHERE w.company_id = $1
    AND (
      ps.warehouse_id IS NOT NULL
      OR r.warehouse_id IS NOT NULL
    )

  ORDER BY w.name ASC
`;

/**
 * Inventory ledger movement history.
 *
 * The updated engine creates one OUT ledger entry
 * per physical inbound layer consumed.
 *
 * Therefore:
 *   - Multiple rows can represent one dispatch line.
 *   - Each row preserves its own physical layer location.
 *   - Each row preserves its own tracking/batch information.
 *   - Each row preserves its allocated financial cost.
 *
 * Do not group these rows by reference_id. They represent
 * separate physical layer movements.
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
      ile.serial_no,

      COALESCE(
        NULLIF(BTRIM(ile.serial_no), ''),
        NULLIF(BTRIM(ile.bin_code), '')
      ) AS tracking_code,

      ile.quantity,
      ile.remaining_quantity,
      ile.direction,
      ile.unit_cost,
      ile.total_cost,
      ile.batch_no,
      ile.expiry_date,
      ile.created_at,

      w.name AS warehouse_name,
      wl.title AS location_name

    FROM inventory_ledger_entries ile

    INNER JOIN warehouses w
      ON w.id = ile.warehouse_id
     AND w.company_id = ile.company_id

    LEFT JOIN warehouse_locations wl
      ON wl.id = ile.location_id
     AND wl.company_id = ile.company_id

    WHERE ile.company_id = $1
        AND ile.item_id = $2
        AND ile.status <> 'CANCELLED'

        /*
        * Full activity:
        *   $3 = false -> include every non-cancelled ledger movement.
        *
        * Stock card:
        *   $3 = true -> only inbound layers with remaining quantity.
        */
        AND (
          $3::boolean = false

          OR (
            ile.direction = 'IN'
            AND ile.remaining_quantity > 0
          )
        )

    ORDER BY
      ile.posting_date DESC,
      ile.created_at DESC,
      ile.id DESC

    LIMIT CASE
      WHEN $3::boolean = true THEN 200
      ELSE NULL
    END

    -- LIMIT 200
  )

  SELECT
    bl.id,

    COALESCE(
      po_from_pr.purchase_invoice_no,
      po_from_pr.order_no,
      jnl.entry_no,
      so_from_sd.sales_invoice_no,
      so_from_sd.order_no,
      cn_from_sd.posted_credit_note_no,
      cn_from_sd.credit_note_no,
      dn_from_sd.debit_note_invoice_no,
      dn_from_sd.debit_note_no,
      st.transfer_no,
      bl.reference_id::text,
      '-'
    ) AS transaction_no,

    COALESCE(
      po_from_pr.id::text,
      jnl.id::text,
      so_from_sd.id::text,
      cn_from_sd.id::text,
      dn_from_sd.id::text,
      st.id::text,
      bl.reference_id::text,
      '-'
    ) AS doc_id,

    bl.transaction_type,
    bl.reference_type,
    bl.reference_id,
    bl.reference_line_id,

    CASE
        WHEN so_from_sd.id IS NOT NULL
            THEN '/sales/invoices/' || so_from_sd.id::text
        WHEN po_from_pr.id IS NOT NULL
            THEN '/purchases/purchase-invoices/' || po_from_pr.id::text
        WHEN jnl.id IS NOT NULL
            THEN '/finance/journals/' || jnl.id::text
        WHEN st.id IS NOT NULL
            THEN '/inventory/transfers/' || st.id::text
        WHEN dn_from_sd.id IS NOT NULL
            THEN '/purchases/posted-debit-notes/' || dn_from_sd.id::text
        WHEN cn_from_sd.id IS NOT NULL
            THEN '/sales/posted-credit-notes/' || cn_from_sd.id::text
        ELSE NULL
    END AS document_url,

    CASE
        WHEN NULLIF(BTRIM(so_from_sd.sales_invoice_no), '') IS NOT NULL
            THEN so_from_sd.sales_invoice_no
        WHEN NULLIF(BTRIM(po_from_pr.purchase_invoice_no), '') IS NOT NULL
            THEN po_from_pr.purchase_invoice_no
        ELSE NULL
    END AS invoice_no,

    CASE
        WHEN NULLIF(BTRIM(so_from_sd.sales_invoice_no), '') IS NOT NULL
            THEN '/sales/invoices/' || so_from_sd.id::text
        WHEN NULLIF(BTRIM(po_from_pr.purchase_invoice_no), '') IS NOT NULL
            THEN '/purchases/purchase-invoices/' || po_from_pr.id::text
        ELSE NULL
    END AS invoice_url, 

    TO_CHAR(bl.posting_date, 'YYYY-MM-DD') AS posting_date,

    bl.status,

    bl.warehouse_id,
    bl.warehouse_name,

    bl.location_id,
    bl.location_name,

    bl.bin_code,
    bl.tracking_code,

    bl.quantity,
    bl.remaining_quantity,

    bl.direction AS movement_direction,

    bl.unit_cost,
    bl.total_cost,

    bl.batch_no,
    bl.serial_no,

    TO_CHAR(bl.expiry_date, 'YYYY-MM-DD') AS expiry_date,

    TO_CHAR(
      bl.created_at,
      'YYYY-MM-DD') AS created_at

  FROM base_ledger bl

  /*
   * PURCHASE RECEIPT
   */
  LEFT JOIN purchase_receipts pr
    ON bl.reference_type = 'PURCHASE_RECEIPT'
   AND pr.id = bl.reference_id
   AND pr.company_id = $1

  LEFT JOIN purchase_orders po_from_pr
    ON po_from_pr.id = pr.purchase_order_id
   AND po_from_pr.company_id = $1

  /*
   * ITEM JOURNAL
   */
  LEFT JOIN journal_entries jnl
    ON bl.reference_type = 'ITEM_JOURNAL'
   AND jnl.id = bl.reference_id
   AND jnl.company_id = $1

  /*
   * STOCK DISPATCH - DEBIT NOTE
   */
  LEFT JOIN stock_dispatches sd
    ON bl.reference_type = 'STOCK_DISPATCH'
   AND sd.id = bl.reference_id
   AND sd.company_id = $1

  LEFT JOIN debit_notes dn_from_sd
    ON dn_from_sd.id = sd.debit_note_id
   AND dn_from_sd.company_id = $1

  /*
   * STOCK DISPATCH - CREDIT NOTE
   */
  LEFT JOIN stock_dispatches sd_credit
    ON bl.reference_type = 'CREDIT_NOTE'
   AND sd_credit.id = bl.reference_id
   AND sd_credit.company_id = $1

  LEFT JOIN credit_notes cn_from_sd
    ON cn_from_sd.id = sd_credit.credit_note_id
   AND cn_from_sd.company_id = $1

  /*
   * SALES SHIPMENT
   */
  LEFT JOIN stock_dispatches sd_sales
    ON bl.reference_type = 'SALES_SHIPMENT'
   AND sd_sales.id = bl.reference_id
   AND sd_sales.company_id = $1

  LEFT JOIN sales_orders so_from_sd
    ON so_from_sd.id = sd_sales.sales_order_id
   AND so_from_sd.company_id = $1

  /*
   * STOCK TRANSFER
   */
  LEFT JOIN transfer_headers st
    ON bl.reference_type IN ('STOCK_TRANSFER', 'TRANSFER')
   AND st.id = bl.reference_id
   AND st.company_id = $1
`;

/**
 * Allocation history.
 *
 * CONSUMPTION:
 *   Allocation linked to a posted outbound ledger entry.
 *
 * RESERVATION:
 *   Active sales-order allocation without an outbound entry.
 *
 * OTHER:
 *   Remaining allocation records that are not reservations
 *   or posted outbound consumption.
 *
 * Important:
 * Do not filter out outbound_entry_id rows. The updated
 * allocation engine creates one allocation for every
 * physical layer consumed.
 */

const allocationsQuery = `
  SELECT
    ia.id,

    ia.warehouse_id,
    w.name AS warehouse_name,

    ia.warehouse_location_id,
    wl.title AS location_name,

    ia.batch_no,

    COALESCE(
      NULLIF(BTRIM(ia.serial_no), ''),
      NULLIF(BTRIM(ia.bin_code), '')
    ) AS tracking_code,

    COALESCE(
      NULLIF(BTRIM(ia.serial_no), ''),
      NULLIF(BTRIM(ia.bin_code), '')
    ) AS bin_code,

    COALESCE(
      NULLIF(BTRIM(ia.serial_no), ''),
      NULLIF(BTRIM(ia.bin_code), '')
    ) AS serial_no,

    TO_CHAR(ia.expiry_date, 'YYYY-MM-DD') AS expiry_date,
    TO_CHAR(ia.date_received, 'YYYY-MM-DD') AS date_received,
    TO_CHAR(ia.prod_date, 'YYYY-MM-DD') AS prod_date,

    ia.allocated_quantity,

    ia.unit_cost,
    ia.total_cost,

    COALESCE(
      ia.physical_layer_unit_cost,
      ia.unit_cost
    ) AS physical_layer_unit_cost,

    COALESCE(
      ia.valuation_unit_cost,
      ia.unit_cost
    ) AS valuation_unit_cost,

    ia.allocation_method,
    ia.status,

    TO_CHAR(ia.created_at, 'YYYY-MM-DD') AS created_at,

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
        AND ia.inbound_entry_id IS NULL
        AND ia.source_allocation_id IS NOT NULL
        AND ia.sales_order_line_id IS NOT NULL
        AND COALESCE(sol.is_deleted, false) = false
        AND COALESCE(sol.quantity_reserved, 0) > 0
        THEN 'RESERVATION'

      ELSE 'OTHER'
    END AS allocation_category

  FROM inventory_allocations ia

  INNER JOIN warehouses w
    ON w.id = ia.warehouse_id
   AND w.company_id = ia.company_id

  LEFT JOIN warehouse_locations wl
    ON wl.id = ia.warehouse_location_id
   AND wl.company_id = ia.company_id

  LEFT JOIN sales_order_lines sol
    ON sol.id = ia.sales_order_line_id
   AND sol.company_id = ia.company_id

  WHERE ia.company_id = $1
    AND ia.item_id = $2
    AND ia.status <> 'CANCELLED'

    /*
     * Full activity:
     *   $3 = false -> all non-cancelled allocations.
     *
     * Allocated stock card:
     *   $3 = true -> only current outstanding reservations.
     */
    AND (
      $3::boolean = false

      OR (
        ia.status = 'ACTIVE'
        AND ia.outbound_entry_id IS NULL
        AND ia.inbound_entry_id IS NULL
        AND ia.source_allocation_id IS NOT NULL
        AND ia.sales_order_line_id IS NOT NULL
        AND COALESCE(sol.is_deleted, false) = false
        AND COALESCE(sol.quantity_reserved, 0) > 0
      )
    )

  ORDER BY
    ia.created_at DESC,
    ia.id DESC

  LIMIT CASE
    WHEN $3::boolean = true THEN 200
    ELSE NULL
  END
`;

export class ItemActivityService {
  static async getActivity(
    companyId: string,
    itemId: string,
  ): Promise<ItemActivityResult> {
    const client: PoolClient = await pool.connect();

    let transactionStarted = false;

    try {
      await client.query(
        "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
      );

      transactionStarted = true;

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

      const [stockResult, transactionResult, allocationResult] =
        await Promise.all([
          client.query<StockRow>(warehouseStockQuery, params),

          client.query<MovementRow>(transactionsQuery, [
            companyId,
            itemId,
            false,
          ]),

          client.query<AllocationRow>(allocationsQuery, [
            companyId,
            itemId,
            false,
          ]),
        ]);

      // const [stockResult, transactionResult, allocationResult] =
      //   await Promise.all([
      //     client.query<StockRow>(warehouseStockQuery, params),
      //     client.query<MovementRow>(transactionsQuery, params),
      //     client.query<AllocationRow>(allocationsQuery, params),
      //   ]);

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
          physical_layer_unit_cost: toNumber(row.physical_layer_unit_cost),
          valuation_unit_cost: toNumber(row.valuation_unit_cost),
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
      transactionStarted = false;

      return {
        summary,
        warehouseStock,
        transactions,
        allocations,
      };
    } catch (error: unknown) {
      if (transactionStarted) {
        await client.query("ROLLBACK");
      }

      throw error;
    } finally {
      client.release();
    }
  }

  static async getStockSummary(
    companyId: string,
    itemId: string,
  ): Promise<ItemStockSummary> {
    const client = await pool.connect();

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

      // Only warehouse stock query.
      // No transaction history.
      // No allocation history.
      const stockResult = await client.query<StockRow>(warehouseStockQuery, [
        companyId,
        itemId,
      ]);

      const summary: ItemStockSummary = {
        totalPhysical: 0,
        totalReserved: 0,
        totalAvailable: 0,
      };

      for (const row of stockResult.rows) {
        summary.totalPhysical += toNumber(row.quantity);
        summary.totalReserved += toNumber(row.reserved_quantity);
        summary.totalAvailable += toNumber(row.available_quantity);
      }

      await client.query("COMMIT");

      return summary;
    } catch (error: unknown) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError: unknown) {
        console.error("Stock summary rollback failed:", rollbackError);
      }

      throw error;
    } finally {
      client.release();
    }
  }

  static async getCardActivity(
    companyId: string,
    itemId: string,
    type: ItemCardActivityType,
  ): Promise<ItemCardActivityResult> {
    const client = await pool.connect();

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

      if (type === "allocated") {
        /*
         * Only current outstanding reservations.
         *
         * Excludes:
         * - Posted consumption
         * - Fully consumed allocations
         * - Cancelled allocations
         * - Non-sales allocations
         * - Deleted sales-order lines
         */
        const result = await client.query<AllocationRow>(allocationsQuery, [
          companyId,
          itemId,
          true,
        ]);

        const allocations: ItemAllocation[] = result.rows.map((row) => ({
          ...row,
          allocated_quantity: toNumber(row.allocated_quantity),
          unit_cost: toNumber(row.unit_cost),
          total_cost: toNumber(row.total_cost),
          physical_layer_unit_cost: toNumber(row.physical_layer_unit_cost),
          valuation_unit_cost: toNumber(row.valuation_unit_cost),
        }));

        await client.query("COMMIT");

        return {
          type,
          allocations,
        };
      }

      /*
       * Total and Available cards:
       *
       * Only inbound ledger layers with remaining quantity.
       * Sold/consumed stock is excluded.
       */
      const result = await client.query<MovementRow>(transactionsQuery, [
        companyId,
        itemId,
        true,
      ]);

      const transactions: ItemMovement[] = result.rows.map((row) => ({
        ...row,
        quantity: toNumber(row.quantity),
        remaining_quantity: toNumber(row.remaining_quantity),
        unit_cost: toNumber(row.unit_cost),
        total_cost: toNumber(row.total_cost),
      }));

      await client.query("COMMIT");

      return {
        type,
        transactions,
      };
    } catch (error: unknown) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError: unknown) {
        console.error("Card activity rollback failed:", rollbackError);
      }

      throw error;
    } finally {
      client.release();
    }
  }
}
/* static async getCardActivity(
    companyId: string,
    itemId: string,
    type: ItemCardActivityType,
  ): Promise<ItemCardActivityResult> {
    const client = await pool.connect();

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

      if (type === "allocated") {
        const result = await client.query<AllocationRow>(
          allocationsQuery,
          params,
        );

        const allocations: ItemAllocation[] = result.rows.map((row) => ({
          ...row,
          allocated_quantity: toNumber(row.allocated_quantity),
          unit_cost: toNumber(row.unit_cost),
          total_cost: toNumber(row.total_cost),
          physical_layer_unit_cost: toNumber(row.physical_layer_unit_cost),
          valuation_unit_cost: toNumber(row.valuation_unit_cost),
        }));

        await client.query("COMMIT");

        return {
          type,
          allocations,
        };
      }

      const result = await client.query<MovementRow>(transactionsQuery, params);

      let transactions: ItemMovement[] = result.rows.map((row) => ({
        ...row,
        quantity: toNumber(row.quantity),
        remaining_quantity: toNumber(row.remaining_quantity),
        unit_cost: toNumber(row.unit_cost),
        total_cost: toNumber(row.total_cost),
      }));

      // Available Stock modal only shows inbound stock
      // layers with remaining available quantity.
      if (type === "available") {
        transactions = transactions.filter(
          (movement) =>
            movement.movement_direction === "IN" &&
            movement.remaining_quantity > 0,
        );
      }

      await client.query("COMMIT");

      return {
        type,
        transactions,
      };
    } catch (error: unknown) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError: unknown) {
        console.error("Card activity rollback failed:", rollbackError);
      }

      throw error;
    } finally {
      client.release();
    }
  } */

// INNER JOIN sales_order_lines sol
//   ON sol.id = ia.sales_order_line_id
//  AND sol.company_id = ia.company_id
/* const allocationsQuery = `
  SELECT
    ia.id,

    ia.warehouse_id,
    w.name AS warehouse_name,

    ia.warehouse_location_id,
    wl.title AS location_name,

    ia.batch_no,

    COALESCE(
      NULLIF(BTRIM(ia.serial_no), ''),
      NULLIF(BTRIM(ia.bin_code), '')
    ) AS tracking_code,

    COALESCE(
      NULLIF(BTRIM(ia.serial_no), ''),
      NULLIF(BTRIM(ia.bin_code), '')
    ) AS bin_code,

    COALESCE(
      NULLIF(BTRIM(ia.serial_no), ''),
      NULLIF(BTRIM(ia.bin_code), '')
    ) AS serial_no,

    TO_CHAR(ia.expiry_date, 'YYYY-MM-DD') AS expiry_date,
    TO_CHAR(ia.date_received, 'YYYY-MM-DD') AS date_received,
    TO_CHAR(ia.prod_date, 'YYYY-MM-DD') AS prod_date,

    ia.allocated_quantity,


    ia.unit_cost,
    ia.total_cost,

    COALESCE(
      ia.physical_layer_unit_cost,
      ia.unit_cost
    ) AS physical_layer_unit_cost,

    COALESCE(
      ia.valuation_unit_cost,
      ia.unit_cost
    ) AS valuation_unit_cost,

    ia.allocation_method,
    ia.status,

    TO_CHAR(
      ia.created_at,
      'YYYY-MM-DD') AS created_at,

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

  INNER JOIN warehouses w
    ON w.id = ia.warehouse_id
   AND w.company_id = ia.company_id

  LEFT JOIN warehouse_locations wl
    ON wl.id = ia.warehouse_location_id
   AND wl.company_id = ia.company_id

  WHERE ia.company_id = $1
    AND ia.item_id = $2
    AND ia.status <> 'CANCELLED'

  ORDER BY
    ia.created_at DESC,
    ia.id DESC

  LIMIT 200
`; */
