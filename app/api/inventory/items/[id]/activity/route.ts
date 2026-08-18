// app/api/inventory/items/[id]/activity/route.ts

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
      SELECT 
        wi.id,
        wi.warehouse_id,
        w.name AS warehouse_name,
        w.code AS warehouse_code,
        wi.location_id,
        wl.title AS location_title,
        wl.code AS location_code,
        wi.batch_no,
        wi.serial_no,
        wi.quantity,
        wi.reserved_quantity,
        wi.available_quantity,
        wi.average_cost,
        wi.last_movement_at,
        wi.expiry_date
      FROM warehouse_inventory wi
      JOIN warehouses w ON w.id = wi.warehouse_id
      LEFT JOIN warehouse_locations wl ON wl.id = wi.location_id
      WHERE wi.company_id = $1 AND wi.item_id = $2
      ORDER BY w.name ASC, wi.created_at DESC
    `;

    // 2. Inventory Transaction Movements History
    const transactionsQuery = `
      SELECT 
        itl.id,
        it.transaction_no,
        it.transaction_type,
        it.reference_type,
        it.reference_id,
        it.posting_date,
        it.status,
        itl.warehouse_id,
        w.name AS warehouse_name,
        itl.quantity,
        itl.base_quantity,
        itl.movement_direction,
        itl.unit_cost,
        itl.total_cost,
        itl.batch_no,
        itl.serial_no,
        itl.created_at
      FROM inventory_transaction_lines itl
      JOIN inventory_transactions it ON it.id = itl.transaction_id
      JOIN warehouses w ON w.id = itl.warehouse_id
      WHERE itl.company_id = $1 AND itl.item_id = $2
      ORDER BY it.posting_date DESC, itl.created_at DESC
      LIMIT 100
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
        ia.created_at,
        ia.sales_order_line_id,
        ia.purchase_order_line_id,
        ia.purchase_invoice_line_id
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

    // Aggregate totals for KPI cards
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
      summary: {
        totalPhysical,
        totalReserved,
        totalAvailable,
      },
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
