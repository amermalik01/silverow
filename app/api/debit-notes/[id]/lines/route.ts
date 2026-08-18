// app/api/debit-notes/[id]/lines/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  const companyId = await getCompanyId();
  const { id } = await params;

  const result = await pool.query(
    `
    SELECT
      dnl.*,

      i.item_code,
      i.name as item_name,

      w.code as warehouse_code,
      w.name as warehouse_name,

      u.name as uom_name,
      u.code as uom_code

    FROM debit_note_lines dnl
    LEFT JOIN items i ON i.id = dnl.item_id
    LEFT JOIN warehouses w ON w.id = dnl.warehouse_id
    LEFT JOIN uoms u ON u.id = dnl.uom_id

    WHERE dnl.company_id=$1 AND dnl.debit_note_id=$2 AND dnl.is_deleted=false
    ORDER BY dnl.line_no
    `,
    [companyId, id],
  );

  return NextResponse.json({
    lines: result.rows,
  });
}
