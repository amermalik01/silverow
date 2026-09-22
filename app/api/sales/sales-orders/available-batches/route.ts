// app/api/sales/sales-orders/available-batches/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  let client;

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);

    const itemId = searchParams.get("item_id");
    const warehouseId = searchParams.get("warehouse_id");

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: "item_id parameter is required." },
        { status: 400 }
      );
    }

    client = await pool.connect();

    const queryParamsList: (string | number)[] = [companyId, itemId];
    let whereClause = `
      ia.company_id = $1
      AND ia.item_id = $2
      AND ia.status = 'ACTIVE'
      AND ia.debit_note_line_id IS NULL
    `;

    if (warehouseId) {
      queryParamsList.push(warehouseId);
      whereClause += ` AND ia.warehouse_id = $${queryParamsList.length}`;
    }

    const query = `
      SELECT
        ia.id AS source_allocation_id,
        ia.id,
        ia.company_id,
        ia.inbound_entry_id,
        ia.item_id,
        ia.warehouse_id,
        ia.warehouse_location_id AS location_id,
        wl.title AS location_name,
        ia.batch_no,
        ia.bin_code,
        -- ia.serial_no,
        TO_CHAR(ia.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        ia.allocated_quantity AS allocated_quantity,
        ia.unit_cost,
        ia.purchase_order_line_id,
        ia.purchase_invoice_line_id,
        ia.created_at AS received_at,
        COALESCE(returned.returned_quantity, 0) AS returned_quantity,
        GREATEST(
          ia.allocated_quantity - COALESCE(returned.returned_quantity, 0),
          0
        ) AS available_quantity
      FROM inventory_allocations ia
      LEFT JOIN warehouse_locations wl
        ON wl.id = ia.warehouse_location_id
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(r.allocated_quantity), 0) AS returned_quantity
        FROM inventory_allocations r
        WHERE r.company_id = ia.company_id
          AND r.source_allocation_id = ia.id
          AND r.status = 'ACTIVE'
          AND r.debit_note_line_id IS NOT NULL
      ) returned ON true
      WHERE ${whereClause}
        AND (ia.allocated_quantity - COALESCE(returned.returned_quantity, 0)) > 0
      ORDER BY 
        CASE WHEN ia.expiry_date IS NULL THEN 1 ELSE 0 END ASC,
        ia.expiry_date ASC,
        ia.created_at ASC,
        ia.id ASC;
    `;

    const result = await client.query(query, queryParamsList);

    const data = result.rows.map((row) => ({
      id: row.id,
      source_allocation_id: row.source_allocation_id,
      inbound_entry_id: row.inbound_entry_id,
      item_id: row.item_id,
      warehouse_id: row.warehouse_id,
      location_id: row.location_id || "",
      location_name: row.location_name || "",
      batch_no: row.batch_no || "",
      bin_code: row.bin_code || "",
     // serial_no: row.serial_no || null,
      expiry_date: row.expiry_date || "",
      allocated_quantity: Number(row.allocated_quantity) || 0,
      returned_quantity: Number(row.returned_quantity) || 0,
      available_quantity: Number(row.available_quantity) || 0,
      unit_cost: Number(row.unit_cost) || 0,
      received_at: row.received_at,
    }));

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("[GET_AVAILABLE_BATCHES_ERROR]:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch available inventory batches.",
      },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}