// app/api/setup/finance/purchase-posting-groups/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId) return NextResponse.json([], { status: 401 });

  const res = await pool.query(
    `SELECT id, name FROM purchase_posting_groups WHERE company_id = $1 ORDER BY name ASC`,
    [companyId],
  );
  return NextResponse.json(res.rows);
}
