// /app/api/lookups/suppliers/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await pool.query(
      `
      SELECT id, name 
      FROM parties 
      WHERE company_id = $1 
        AND type = 'SUPPLIER' -- 🟢 Filters partitioned table for suppliers
        AND status = 'active'
      ORDER BY name ASC
      `,
      [companyId],
    );

    return NextResponse.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load suppliers" },
      { status: 500 },
    );
  }
}
