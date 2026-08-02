// /app/api/inventory/warehouses/route.ts

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
      code: string;
      name: string;
      type: string;
      status: number;
    }>(
      `
      SELECT 
        id,
        code,
        name,
        type,
        status
      FROM warehouses
      WHERE company_id = $1 AND status = 1
      ORDER BY name ASC
      `,
      [companyId],
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error(
      "CRITICAL ERROR: Failed to fetch warehouses lookup list:",
      error,
    );
    return NextResponse.json(
      {
        error:
          "Internal server error occurred while retrieving warehouse profiles",
      },
      { status: 500 },
    );
  }
}

/* import { NextResponse } from "next/server";
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
      code: string;
      name: string;
      type: string;
      status: number;
    }>(
      `
      SELECT 
        id,
        code,
        name,
        type,
        status
      FROM warehouses
      WHERE company_id = $1 AND status = 1
      ORDER BY name ASC
      `,
      [companyId],
    );

    return NextResponse.json({
      success: true,
      warehouses: result.rows,
    });
  } catch (error) {
    console.error(
      "CRITICAL ERROR: Failed to fetch warehouses lookup list:",
      error,
    );
    return NextResponse.json(
      {
        error:
          "Internal server error occurred while retrieving warehouse profiles",
      },
      { status: 500 },
    );
  }
} */
