// app/api/sales/sales-orders/[id]/lines/route.ts

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
      sol.*,

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
            WHERE ia.sales_order_line_id = sol.id 
              AND ia.company_id = $1
              AND ia.status = 'ACTIVE'
          ),
          '[]'::json
        ) AS allocations

    FROM sales_order_lines sol
    LEFT JOIN items i ON i.id = sol.item_id
    LEFT JOIN warehouses w ON w.id = sol.warehouse_id
    LEFT JOIN uoms u ON u.id = sol.uom_id -- Updated from "units" to "uoms"

    WHERE sol.company_id=$1 AND sol.sales_order_id=$2 AND sol.is_deleted=false
    ORDER BY sol.line_no
    `,
      [companyId, id],
    );

    return NextResponse.json({
      lines: result.rows,
    });
  } catch (error) {
    console.error("GET Sales Order Lines Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Sales order lines" },
      { status: 500 },
    );
  }
}
