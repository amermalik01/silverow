// app/api/inventory/items/[id]/cards-activity/route.ts


import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import {
  ItemActivityService,
  type ItemMovement,
  type ItemAllocation,
} from "@/lib/services/inventory/item-activity.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type StockDetailRow = {
  id: string;
  document_type: string;
  date: string | null;
  document_no: string | null;
  invoice_no: string | null;
  consignment_no: string | null;
  batch_no: string | null;
  production_date: string | null;
  use_by_date: string | null;
  received_date: string | null;
  dispatch_date: string | null;
  warehouse: string;
  storage_location: string | null;
  qty: number;
  sold_qty: number | null;
  allocated_qty: number | null;
  available_qty: number | null;
  uom: string | null;
  direction?: string;
  status?: string;
};

const transactionLabels: Record<string, string> = {
  PURCHASE_RECEIPT: "Purchase Receipt",
  PURCHASE_RETURN: "Purchase Return",
  SALES_SHIPMENT: "Sales Shipment",
  SHIPMENT: "Sales Shipment",
  STOCK_TRANSFER_OUT: "Stock Transfer Out",
  STOCK_TRANSFER_IN: "Stock Transfer In",
  OPENING_BALANCE: "Opening Balance",
  ITEM_JOURNAL_IN: "Item Journal Positive",
  ITEM_JOURNAL_OUT: "Item Journal Negative",
  DEBIT_NOTE_RETURN: "Debit Note Return",
  CREDIT_NOTE_RETURN: "Credit Note Return",
  ADJUSTMENT: "Stock Adjustment",
  TRANSFER: "Stock Transfer",
  RETURN: "Stock Return",
  PRODUCTION: "Production",
};

function getTransactionLabel(
  transactionType: string,
  direction: "IN" | "OUT",
): string {
  return (
    transactionLabels[transactionType] ??
    (direction === "IN" ? "Stock Receipt" : "Stock Issue")
  );
}

function getAllocationLabel(
  allocation: ItemAllocation,
): string {
  if (allocation.allocation_category === "CONSUMPTION") {
    return "Posted Stock Consumption";
  }

  if (allocation.allocation_category === "RESERVATION") {
    return "Sales Order Reservation";
  }

  if (allocation.purchase_order_line_id) {
    return "Purchase Order Allocation";
  }

  if (allocation.purchase_invoice_line_id) {
    return "Purchase Invoice Allocation";
  }

  if (allocation.debit_note_line_id) {
    return "Debit Note Allocation";
  }

  if (allocation.credit_note_line_id) {
    return "Credit Note Allocation";
  }

  if (allocation.journal_line_id) {
    return "Item Journal Allocation";
  }

  if (allocation.sales_order_line_id) {
    return "Sales Order Allocation";
  }

  return "Stock Allocation";
}

function mapTransaction(
  movement: ItemMovement,
): StockDetailRow {
  const isInbound = movement.movement_direction === "IN";

  return {
    id: movement.id,

    document_type: getTransactionLabel(
      movement.transaction_type,
      movement.movement_direction,
    ),

    date: movement.posting_date,
    document_no: movement.transaction_no,

    invoice_no: null,
    consignment_no: null,

    batch_no: movement.batch_no,
    production_date: null,
    use_by_date: movement.expiry_date,
    received_date: isInbound
      ? movement.posting_date
      : null,
    dispatch_date: isInbound
      ? null
      : movement.posting_date,

    warehouse: movement.warehouse_name,
    storage_location:
      movement.location_name ?? movement.bin_code,

    qty: isInbound
      ? movement.quantity
      : -movement.quantity,

    sold_qty:
      movement.transaction_type === "SALES_SHIPMENT" ||
      movement.transaction_type === "SHIPMENT"
        ? movement.quantity
        : null,

    allocated_qty: null,

    available_qty: isInbound
      ? movement.remaining_quantity
      : null,

    uom: null,
    direction: movement.movement_direction,
    status: movement.status,
  };
}

function mapAllocation(
  allocation: ItemAllocation,
): StockDetailRow {
  const isReservation =
    allocation.allocation_category === "RESERVATION";

  return {
    id: allocation.id,

    document_type: getAllocationLabel(allocation),
    date: allocation.created_at,

    // The allocation schema contains line IDs,
    // not the human-readable document number.
    document_no: null,
    invoice_no: null,
    consignment_no: null,

    batch_no: allocation.batch_no,
    production_date: allocation.prod_date,
    use_by_date: allocation.expiry_date,
    received_date: allocation.date_received,
    dispatch_date: null,

    warehouse: allocation.warehouse_name,

    storage_location:
      allocation.location_name ?? allocation.bin_code,

    qty: allocation.allocated_quantity,
    sold_qty: null,

    allocated_qty: allocation.allocated_quantity,

    // Only a reservation reduces uncommitted
    // availability. An allocation row itself
    // does not contain the available stock balance.
    available_qty: null,

    uom: null,

    direction: isReservation ? "RESERVED" : "ALLOCATED",
    status: allocation.status,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext,
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 },
      );
    }

    const activity = await ItemActivityService.getActivity(
      companyId,
      itemId,
    );

    const transactions: StockDetailRow[] =
      activity.transactions.map(mapTransaction);

    const allocations: StockDetailRow[] =
      activity.allocations.map(mapAllocation);

    return NextResponse.json({
      summary: activity.summary,
      warehouseStock: activity.warehouseStock,
      transactions,
      allocations,
    });
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message === "ITEM_NOT_FOUND"
    ) {
      return NextResponse.json(
        { error: "Item not found" },
        { status: 404 },
      );
    }

    console.error("Item Cards Activity API Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load item card activity",
      },
      { status: 500 },
    );
  }
}


/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: itemId } = await params;

    // 1. Warehouse Stock Summary Breakdown
    const warehouseStockQuery = `
      WITH physical_stock AS (
        SELECT 
          w.id AS warehouse_id,
          w.name AS warehouse_name,
          w.code AS warehouse_code,
          wl.id AS location_id,
          wl.title AS location_title,
          wl.code AS location_code,
          ile.batch_no,
          ile.serial_no,
          SUM(ile.remaining_quantity) AS physical_qty,
          CASE 
            WHEN SUM(ile.remaining_quantity) > 0 
            THEN SUM(ile.remaining_quantity * ile.unit_cost) / SUM(ile.remaining_quantity) 
            ELSE 0 
          END AS average_cost,
          MAX(ile.expiry_date) AS expiry_date,
          MAX(ile.created_at) AS last_movement_at
        FROM inventory_ledger_entries ile
        JOIN warehouses w ON w.id = ile.warehouse_id
        LEFT JOIN warehouse_locations wl ON wl.id = ile.location_id
        WHERE ile.company_id = $1 
          AND ile.item_id = $2 
          AND ile.direction = 'IN' 
          AND ile.status = 'OPEN'
        GROUP BY w.id, w.name, w.code, wl.id, wl.title, wl.code, ile.batch_no, ile.serial_no
      ),
      reserved_stock AS (
        SELECT 
          ia.warehouse_id,
          ia.batch_no,
          COALESCE(SUM(ia.allocated_quantity), 0) AS reserved_qty
        FROM inventory_allocations ia
        WHERE ia.company_id = $1 
          AND ia.item_id = $2
          AND ia.status = 'ACTIVE'
        GROUP BY ia.warehouse_id, ia.batch_no
      )
      SELECT 
        ps.warehouse_id,
        ps.warehouse_name,
        ps.warehouse_code,
        ps.location_id,
        ps.location_title,
        ps.location_code,
        ps.batch_no,
        ps.serial_no,
        ps.physical_qty AS quantity,
        COALESCE(rs.reserved_qty, 0) AS reserved_quantity,
        GREATEST(0, ps.physical_qty - COALESCE(rs.reserved_qty, 0)) AS available_quantity,
        ps.average_cost,
        ps.expiry_date,
        ps.last_movement_at
      FROM physical_stock ps
      LEFT JOIN reserved_stock rs ON rs.warehouse_id = ps.warehouse_id 
        AND COALESCE(rs.batch_no, '') = COALESCE(ps.batch_no, '')
      ORDER BY ps.warehouse_name ASC
    `;

    // 2. Comprehensive Inventory Movement History (Fixed missing allocated_quantity column)
    const transactionsQuery = `
      SELECT 
        ile.id,
        CASE 
          WHEN ile.direction = 'IN' THEN 'Stock Receipt'
          ELSE 'Stock Issue'
        END AS document_type,
        COALESCE(ile.posting_date, ile.created_at::date) AS date,
        COALESCE(ile.reference_id::text, ile.id::text) AS document_no,
        CAST(NULL AS TEXT) AS invoice_no,
        CAST(NULL AS TEXT) AS consignment_no,
        ile.batch_no,
        CAST(NULL AS DATE) AS production_date,
        ile.expiry_date AS use_by_date,
        CAST(NULL AS DATE) AS received_date,
        CAST(NULL AS DATE) AS dispatch_date,
        w.name AS warehouse,
        wl.title AS storage_location,
        ile.quantity AS qty,
        0 AS sold_qty,
        0 AS allocated_qty,
        ile.quantity AS available_qty,
        'Pcs' AS uom,
        ile.direction
      FROM inventory_ledger_entries ile
      JOIN warehouses w ON w.id = ile.warehouse_id
      LEFT JOIN warehouse_locations wl ON wl.id = ile.location_id
      WHERE ile.company_id = $1 AND ile.item_id = $2
      ORDER BY ile.created_at DESC
      LIMIT 200
    `;

    // 3. Active Inventory Allocations
    const allocationsQuery = `
      SELECT 
        ia.id,
        CASE 
          WHEN ia.sales_order_line_id IS NOT NULL THEN 'Sales Order'
          WHEN ia.purchase_order_line_id IS NOT NULL THEN 'Purchase Order'
          WHEN ia.purchase_invoice_line_id IS NOT NULL THEN 'Purchase Invoice'
          ELSE 'Stock Allocation'
        END AS document_type,
        ia.created_at AS date,
        CAST(NULL AS TEXT) AS document_no,
        CAST(NULL AS TEXT) AS invoice_no,
        CAST(NULL AS TEXT) AS consignment_no,
        ia.batch_no,
        ia.prod_date AS production_date,
        ia.expiry_date AS use_by_date,
        ia.date_received AS received_date,
        CAST(NULL AS DATE) AS dispatch_date,
        w.name AS warehouse,
        ia.bin_code AS storage_location,
        ia.allocated_quantity AS qty,
        0 AS sold_qty,
        ia.allocated_quantity AS allocated_qty,
        0 AS available_qty,
        'Pcs' AS uom
      FROM inventory_allocations ia
      JOIN warehouses w ON w.id = ia.warehouse_id
      WHERE ia.company_id = $1 AND ia.item_id = $2 AND ia.status = 'ACTIVE'
      ORDER BY ia.created_at DESC
      LIMIT 50
    `;

    const [stockRes, transRes, allocRes] = await Promise.all([
      pool.query(warehouseStockQuery, [companyId, itemId]),
      pool.query(transactionsQuery, [companyId, itemId]),
      pool.query(allocationsQuery, [companyId, itemId]),
    ]);

    const totalPhysical = stockRes.rows.reduce(
      (sum, r) => sum + Number(r.quantity || 0),
      0,
    );
    const totalReserved = stockRes.rows.reduce(
      (sum, r) => sum + Number(r.reserved_quantity || 0),
      0,
    );
    const totalAvailable = stockRes.rows.reduce(
      (sum, r) => sum + Number(r.available_quantity || 0),
      0,
    );

    return NextResponse.json({
      summary: { totalPhysical, totalReserved, totalAvailable },
      warehouseStock: stockRes.rows,
      transactions: transRes.rows,
      allocations: allocRes.rows,
    });
  } catch (err) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Failed to load item activity" },
      { status: 500 },
    );
  }
}
 */