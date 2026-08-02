// app/api/inventory/warehouse-locations/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await pool.query<{
      id: string;
      warehouse_id: string;
      title: string;
      code: string | null;
      cost_frequency: string | null;
      unit_of_measure: string | null;
      currency: string | null;
      cost: number | null;
      status: number;
    }>(
      `
      SELECT 
        id,
        warehouse_id,
        title,
        code,
        cost_frequency,
        unit_of_measure,
        currency,
        cost,
        status
      FROM warehouse_locations
      WHERE company_id = $1 AND status = 1
      ORDER BY title ASC
      `,
      [companyId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "CRITICAL ERROR: Failed to fetch warehouse locations lookup list:",
      error
    );
    return NextResponse.json(
      {
        error:
          "Internal server error occurred while retrieving warehouse location records",
      },
      { status: 500 }
    );
  }
}