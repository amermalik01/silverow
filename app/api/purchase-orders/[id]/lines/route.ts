// app/api/purchase-orders/[id]/lines/route.ts

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
      pol.*,

      i.item_code,
      i.name as item_name,

      w.code as warehouse_code,
      w.name as warehouse_name,

      u.name as uom_name,
      u.code as uom_code

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
}

/* import { NextRequest, NextResponse } from "next/server";

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
      pol.*,

      i.item_code,
      i.name as item_name,

      w.code as warehouse_code,
      w.name as warehouse_name,

      u.name as uom_name

    FROM purchase_order_lines pol
    LEFT JOIN items i ON i.id = pol.item_id
    LEFT JOIN warehouses w ON w.id = pol.warehouse_id
    LEFT JOIN units u ON u.id = pol.uom_id

    WHERE pol.company_id=$1 AND pol.purchase_order_id=$2 AND pol.is_deleted=false
    ORDER BY pol.line_no
    `,
    [companyId, id],
  );

  return NextResponse.json({
    lines: result.rows,
  });
} */
