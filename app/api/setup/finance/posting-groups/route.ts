// app/api/setup/finance/posting-groups/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId) return NextResponse.json([], { status: 401 });

  try {
    const result = await pool.query(
      `SELECT id AS value, name AS label
       FROM vat_business_posting_groups
       WHERE company_id=$1
       ORDER BY name ASC`,
      [companyId],
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Database Error inside accounts/options:", error);

    return NextResponse.json(
      { error: "Failed to fetch accounts lookup data" },
      { status: 500 },
    );
  }
}
