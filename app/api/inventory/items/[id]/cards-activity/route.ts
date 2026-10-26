// app/api/inventory/items/[id]/cards-activity/route.ts

import { NextRequest, NextResponse } from "next/server";
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

    // 2. Comprehensive Inventory Movement History
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
        COALESCE(ile.allocated_quantity, 0) AS allocated_qty,
        GREATEST(0, ile.quantity - COALESCE(ile.allocated_quantity, 0)) AS available_qty,
        'Pcs' AS uom,
        ile.direction
      FROM inventory_ledger_entries ile
      JOIN warehouses w ON w.id = ile.warehouse_id
      LEFT JOIN warehouse_locations wl ON wl.id = ile.location_id
      WHERE ile.company_id = $1 AND ile.item_id = $2
      ORDER BY ile.created_at DESC
      LIMIT 200
    `;

    // 3. Active Inventory Allocations (Using exact schema column names like prod_date, date_received)
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

    // Warehouse & stock metrics summary query
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

    // Detailed ledger entries with document metadata for Total Stock / Available Stock sheets
    const transactionsQuery = `
      SELECT 
        ile.id,
        COALESCE(ile.document_type, 'Stock Entry') AS document_type,
        ile.posting_date AS date,
        COALESCE(ile.reference_id, ile.id) AS document_no,
        ile.invoice_no,
        ile.consignment_no,
        ile.batch_no,
        ile.production_date,
        ile.expiry_date AS use_by_date,
        ile.received_date,
        ile.dispatch_date,
        w.name AS warehouse,
        wl.title AS storage_location,
        ile.quantity AS qty,
        ile.sold_qty,
        ile.allocated_qty,
        GREATEST(0, ile.quantity - COALESCE(ile.allocated_qty, 0)) AS available_qty,
        COALESCE(ile.uom, 'Pcs') AS uom,
        ile.direction
      FROM inventory_ledger_entries ile
      JOIN warehouses w ON w.id = ile.warehouse_id
      LEFT JOIN warehouse_locations wl ON wl.id = ile.location_id
      WHERE ile.company_id = $1 AND ile.item_id = $2
      ORDER BY ile.posting_date DESC, ile.created_at DESC
      LIMIT 200
    `;

    // Active allocations with legacy fields
    const allocationsQuery = `
      SELECT 
        ia.id,
        COALESCE(ia.document_type, 'Sales Order') AS document_type,
        ia.posting_date AS date,
        ia.document_no,
        ia.invoice_no,
        ia.consignment_no,
        ia.batch_no,
        ia.production_date,
        ia.expiry_date AS use_by_date,
        ia.received_date,
        ia.dispatch_date,
        w.name AS warehouse,
        ia.bin_code AS storage_location,
        ia.qty,
        ia.sold_qty,
        ia.allocated_quantity AS allocated_qty,
        ia.available_qty,
        COALESCE(ia.uom, 'Pcs') AS uom
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
} */
