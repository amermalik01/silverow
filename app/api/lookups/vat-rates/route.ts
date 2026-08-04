// app/api/lookups/vat-rates/route.ts

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
    const vatBusinessGroupId = searchParams.get("vat_business_group_id");

    let query: string;
    let params: (string | null)[];

    if (vatBusinessGroupId) {
      // 1. Precise match using the vendor's VAT Business Posting Group UUID
      query = `
        SELECT 
          vpg.id,
          vpg.name AS code,
          vpg.name AS description,
          COALESCE(vps.vat_rate, 0) AS vat_percent,
          vpg.id AS vat_product_group_id
        FROM vat_product_posting_groups vpg
        LEFT JOIN vat_posting_setup vps 
          ON vps.vat_product_group_id = vpg.id 
         AND vps.vat_business_group_id = $2
         AND vps.company_id = vpg.company_id
        WHERE vpg.company_id = $1
          AND vpg.is_active = true
        ORDER BY vpg.name ASC;
      `;
      params = [companyId, vatBusinessGroupId];
    } else {
      // 2. Fallback if no vendor group is selected yet: pick the MAX configured rate per group
      query = `
        SELECT 
          vpg.id,
          vpg.name AS code,
          vpg.name AS description,
          COALESCE(MAX(vps.vat_rate), 0) AS vat_percent,
          vpg.id AS vat_product_group_id
        FROM vat_product_posting_groups vpg
        LEFT JOIN vat_posting_setup vps 
          ON vps.vat_product_group_id = vpg.id 
         AND vps.company_id = vpg.company_id
        WHERE vpg.company_id = $1
          AND vpg.is_active = true
        GROUP BY vpg.id, vpg.name
        ORDER BY vpg.name ASC;
      `;
      params = [companyId];
    }

    const result = await pool.query(query, params);

    // Cast vat_percent to standard numeric Float (PostgreSQL NUMERIC returns string)
    const formattedData = result.rows.map((row) => ({
      ...row,
      vat_percent: Number(row.vat_percent || 0),
    }));

    return NextResponse.json({
      data: formattedData,
    });
  } catch (err) {
    console.error("Error loading VAT rates:", err);
    return NextResponse.json(
      { error: "Failed to load VAT options" },
      { status: 500 },
    );
  }
}
