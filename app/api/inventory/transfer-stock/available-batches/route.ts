// app/api/inventory/transfer-stock/available-batches/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  let client: PoolClient | null = null;

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const params = new URL(req.url).searchParams;
    const itemId = params.get("item_id");
    const warehouseId = params.get("warehouse_id");
    const locationId = params.get("location_id");

    if (!itemId || !warehouseId) {
      return NextResponse.json(
        {
          success: false,
          error: "item_id and warehouse_id are required.",
        },
        { status: 400 },
      );
    }

    client = await pool.connect();

    const queryParams: string[] = [companyId, itemId, warehouseId];

    let locationCondition = "";

    if (locationId) {
      queryParams.push(locationId);
      locationCondition = `AND ia.warehouse_location_id = $${queryParams.length}`;
    }

    const query = `
      SELECT
        ia.id,
        ia.id AS source_allocation_id,
        ia.inbound_entry_id,
        ia.item_id,
        ia.warehouse_id,
        ia.warehouse_location_id AS location_id,
        COALESCE(wl.title, '') AS location_name,

        TO_CHAR(ia.expiry_date, 'YYYY-MM-DD') AS expiry_date,
        TO_CHAR(ia.date_received, 'YYYY-MM-DD') AS date_received,
        TO_CHAR(ia.prod_date, 'YYYY-MM-DD') AS prod_date,

        COALESCE(ia.batch_no, '') AS batch_no,
        COALESCE(ia.bin_code, '') AS bin_code,
        COALESCE(ia.bin_code, '') AS serial_no,
        COALESCE(ia.unit_cost, 0) AS unit_cost,

        GREATEST(
          COALESCE(ia.allocated_quantity, 0)
          - COALESCE(returns.returned_quantity, 0)
          - COALESCE(sales.reserved_quantity, 0)
          - COALESCE(transfers.transferred_quantity, 0),
          0
        ) AS available_quantity

      FROM inventory_allocations ia

      LEFT JOIN warehouse_locations wl
        ON wl.id = ia.warehouse_location_id
       AND wl.company_id = ia.company_id

      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(r.allocated_quantity), 0) AS returned_quantity
        FROM inventory_allocations r
        WHERE r.company_id = ia.company_id
          AND r.source_allocation_id = ia.id
          AND r.status = 'ACTIVE'
          AND r.debit_note_line_id IS NOT NULL
      ) returns ON true

      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(r.allocated_quantity), 0) AS reserved_quantity
        FROM inventory_allocations r
        INNER JOIN sales_order_lines sol
          ON sol.id = r.sales_order_line_id
         AND sol.company_id = r.company_id
        WHERE r.company_id = ia.company_id
          AND r.source_allocation_id = ia.id
          AND r.status = 'ACTIVE'
          AND r.sales_order_line_id IS NOT NULL
          AND COALESCE(sol.is_deleted, false) = false
      ) sales ON true

      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(r.allocated_quantity), 0) AS transferred_quantity
        FROM inventory_allocations r
        INNER JOIN inventory_ledger_entries outbound
          ON outbound.id = r.outbound_entry_id
         AND outbound.company_id = r.company_id
        WHERE r.company_id = ia.company_id
          AND r.source_allocation_id = ia.id
          AND r.status = 'ACTIVE'
          AND outbound.direction = 'OUT'
          AND outbound.transaction_type = 'STOCK_TRANSFER_OUT'
      ) transfers ON true

      WHERE ia.company_id = $1
        AND ia.item_id = $2
        AND ia.warehouse_id = $3
        AND ia.status = 'ACTIVE'
        AND ia.source_allocation_id IS NULL
        AND ia.sales_order_line_id IS NULL
        AND ia.debit_note_line_id IS NULL
        AND ia.credit_note_line_id IS NULL

        ${locationCondition}

        AND GREATEST(
          COALESCE(ia.allocated_quantity, 0)
          - COALESCE(returns.returned_quantity, 0)
          - COALESCE(sales.reserved_quantity, 0)
          - COALESCE(transfers.transferred_quantity, 0),
          0
        ) > 0

      ORDER BY
        CASE WHEN ia.expiry_date IS NULL THEN 1 ELSE 0 END,
        ia.expiry_date ASC,
        ia.created_at ASC,
        ia.id ASC
    `;

    const result = await client.query(query, queryParams);

    const data = result.rows.map((row) => ({
      id: String(row.id),
      source_allocation_id: String(row.source_allocation_id),
      inbound_entry_id: row.inbound_entry_id
        ? String(row.inbound_entry_id)
        : null,
      item_id: String(row.item_id),
      warehouse_id: String(row.warehouse_id),
      location_id: row.location_id ? String(row.location_id) : "",
      location_name: row.location_name || "",
      batch_no: row.batch_no || "",
      bin_code: row.bin_code || "",
      serial_no: row.serial_no || "",
      expiry_date: row.expiry_date || "",
      date_received: row.date_received || "",
      prod_date: row.prod_date || "",
      available_quantity: Number(row.available_quantity) || 0,
      available_qty: Number(row.available_quantity) || 0,
      unit_cost: Number(row.unit_cost) || 0,
    }));

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("[STOCK_TRANSFER_AVAILABLE_BATCHES_ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch available stock.",
      },
      { status: 500 },
    );
  } finally {
    client?.release();
  }
}
