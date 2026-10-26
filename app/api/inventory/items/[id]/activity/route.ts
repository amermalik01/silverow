// app/api/inventory/items/[id]/activity/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ItemActivityService } from "@/lib/services/inventory/item-activity.service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: itemId } = await params;

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 },
      );
    }

    const activity = await ItemActivityService.getActivity(companyId, itemId);

    return NextResponse.json(activity);
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    console.error("Item Activity API Error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load item activity",
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

    // 1. Warehouse Stock Summary Breakdown (Computed Physical, Reserved, & Available Stock)
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

    // 2. Comprehensive Inventory Movement History (All IN & OUT ledger entries)
    const transactionsQuery = `
      SELECT 
        ile.id,
        COALESCE(ile.reference_id, ile.id) AS transaction_no,
        ile.transaction_type,
        ile.reference_type,
        ile.reference_id,
        ile.posting_date,
        ile.status,
        ile.warehouse_id,
        w.name AS warehouse_name,
        ile.quantity,
        ile.direction AS movement_direction,
        ile.unit_cost,
        ile.total_cost,
        ile.batch_no,
        ile.serial_no,
        ile.created_at
      FROM inventory_ledger_entries ile
      JOIN warehouses w ON w.id = ile.warehouse_id
      WHERE ile.company_id = $1 AND ile.item_id = $2
      ORDER BY ile.posting_date DESC, ile.created_at DESC
      LIMIT 200
    `;

    // 3. Active Inventory Allocations
    const allocationsQuery = `
      SELECT 
        ia.id,
        ia.warehouse_id,
        w.name AS warehouse_name,
        ia.batch_no,
        ia.bin_code,
        ia.allocated_quantity,
        ia.unit_cost,
        ia.total_cost,
        ia.allocation_method,
        ia.status,
        ia.created_at
      FROM inventory_allocations ia
      JOIN warehouses w ON w.id = ia.warehouse_id
      WHERE ia.company_id = $1 AND ia.item_id = $2
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
