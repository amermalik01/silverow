// app/api/sales/sales-returns/[id]/lines/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    const result = await pool.query(
      `
      SELECT
        cnl.*,

        i.item_code,
        i.name AS item_name,

        w.code AS warehouse_code,
        w.name AS warehouse_name,

        u.name AS uom_name,
        u.code AS uom_code,

        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ia.id,
                'source_allocation_id', ia.source_allocation_id,
                'location_id', ia.warehouse_location_id,
                'location_code', wl.code,
                'location_name', wl.title,
                'quantity', ia.allocated_quantity,
                'return_quantity', ia.allocated_quantity,
                'unit_cost', ia.unit_cost,
                'batch_no', ia.batch_no,
                'serial_no', ia.bin_code,
                'bin_code', ia.bin_code,
                'expiry_date', ia.expiry_date
              )
            )
            FROM inventory_allocations ia
            LEFT JOIN warehouse_locations wl 
              ON wl.id = ia.warehouse_location_id 
             AND wl.company_id = $1
            WHERE ia.credit_note_line_id = cnl.id 
              AND ia.company_id = $1
              AND ia.status = 'ACTIVE'
          ),
          '[]'::json
        ) AS allocations

      FROM credit_note_lines cnl
      LEFT JOIN items i ON i.id = cnl.item_id AND i.company_id = $1
      LEFT JOIN warehouses w ON w.id = cnl.warehouse_id AND w.company_id = $1
      LEFT JOIN uoms u ON u.id = cnl.uom_id AND u.company_id = $1

      WHERE cnl.company_id = $1 
        AND cnl.credit_note_id = $2 
        AND COALESCE(cnl.is_deleted, false) = false
      ORDER BY cnl.line_no
      `,
      [companyId, id],
    );

    return NextResponse.json({
      lines: result.rows,
    });
  } catch (error) {
    console.error("GET Sales Return Lines Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Sales return lines" },
      { status: 500 },
    );
  }
}
