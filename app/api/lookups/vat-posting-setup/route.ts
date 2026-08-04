// app/api/lookups/vat-posting-setup/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const vatBusinessGroupId = searchParams.get("vat_business_group_id") || "";
    const vatProductGroupId = searchParams.get("vat_product_group_id") || "";

    if (!vatBusinessGroupId || !vatProductGroupId) {
      return NextResponse.json({ data: null });
    }

    const query = `
      SELECT 
        id,
        vat_business_group_id,
        vat_product_group_id,
        vat_rate,
        vat_percent
      FROM vat_posting_setup
      WHERE company_id = $1
        AND vat_business_group_id = $2
        AND vat_product_group_id = $3
      LIMIT 1;
    `;

    const result = await pool.query(query, [
      companyId,
      vatBusinessGroupId,
      vatProductGroupId,
    ]);

    return NextResponse.json({
      data: result.rows[0] || null,
    });
  } catch (err) {
    console.error("Error looking up VAT posting setup:", err);
    return NextResponse.json(
      { error: "Failed to load VAT rate setup" },
      { status: 500 },
    );
  }
}
