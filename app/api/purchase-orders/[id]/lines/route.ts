// app/api/purchase-orders/[id]/lines/route.ts

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
      pol.*,

      i.item_code,
      i.name as item_name,

      w.code as warehouse_code,
      w.name as warehouse_name,

      u.name as uom_name,
      u.code as uom_code,

      COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ia.id,
                'location_id', ia.warehouse_location_id,
                'quantity', ia.allocated_quantity,
                'batch_no', ia.batch_no,
                'expiry_date', ia.expiry_date
              )
            )
            FROM inventory_allocations ia
            WHERE ia.purchase_order_line_id = pol.id 
              AND ia.company_id = $1
              AND ia.status = 'ACTIVE'
          ),
          '[]'::json
        ) AS allocations

    FROM purchase_order_lines pol
    LEFT JOIN items i ON i.id = pol.item_id
    LEFT JOIN warehouses w ON w.id = pol.warehouse_id
    LEFT JOIN uoms u ON u.id = pol.uom_id -- Updated from "units" to "uoms"

    WHERE pol.company_id=$1 AND pol.purchase_order_id=$2 AND pol.is_deleted=false
    ORDER BY pol.line_no
    `,
      [companyId, id],
    );

    return NextResponse.json({
      lines: result.rows,
    });

  } catch (error) {
    console.error("GET Purchase Order Lines Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase order lines" },
      { status: 500 },
    );
  }
}
