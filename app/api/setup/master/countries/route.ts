// app/api/setup/master/countries/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        country_id,
        nicename AS name,
        iso AS code
      FROM public.country
      WHERE is_active = true
      ORDER BY nicename ASC;
      `,
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Countries GET Exception:", error);

    return NextResponse.json(
      { error: "Internal operational system failure" },
      { status: 500 },
    );
  }
}
