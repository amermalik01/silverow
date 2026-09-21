// app/api/sales/sales-quotes/[id]/lines/route.ts

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

    // Guard against non-UUID "new" route
    if (!id || id === "new") {
      return NextResponse.json({ lines: [] });
    }

    const result = await pool.query(
      `
      SELECT
        sql.*,

        i.item_code,
        i.name as item_name,

        w.code as warehouse_code,
        w.name as warehouse_name,

        u.name as uom_name,
        u.code as uom_code

      FROM sales_quote_lines sql
      LEFT JOIN items i ON i.id = sql.item_id
      LEFT JOIN warehouses w ON w.id = sql.warehouse_id
      LEFT JOIN uoms u ON u.id = sql.uom_id

      WHERE sql.company_id = $1 
        AND sql.sales_quote_id = $2 
        AND sql.is_deleted = false
      ORDER BY sql.line_no ASC
      `,
      [companyId, id],
    );

    return NextResponse.json({
      lines: result.rows,
    });
  } catch (error) {
    console.error("GET Sales Quote Lines Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Sales Quote lines" },
      { status: 500 },
    );
  }
}
