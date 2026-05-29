// /app/api/sales/sales-invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }
    const { searchParams } = request.nextUrl;

    // Parse query constraints
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10));
    const offset = (page - 1) * limit;

    // Build conditional query strings dynamically using array variables
    const queryParams: (string | number | boolean)[] = [companyId];
    let whereClause = "WHERE si.company_id = $1";

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (si.invoice_no ILIKE $${queryParams.length} OR p.name ILIKE $${queryParams.length})`;
    }

    if (status !== "ALL") {
      queryParams.push(status === "POSTED");
      whereClause += ` AND si.is_posted = $${queryParams.length}`;
    }

    // 1. Get total records matching criteria
    const countQuery = `
      SELECT COUNT(*) 
      FROM sales_invoices si
      LEFT JOIN parties p ON p.id = si.customer_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0].count, 10);

    // 2. Fetch target page data records
    queryParams.push(limit, offset);
    const dataQuery = `
      SELECT 
        si.id,
        si.invoice_no,
        si.invoice_date,
        si.total_amount,
        si.is_posted,
        p.name as customer_name
      FROM sales_invoices si
      LEFT JOIN parties p ON p.id = si.customer_id
      ${whereClause}
      ORDER BY si.invoice_date DESC, si.invoice_no DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;
    const dataResult = await pool.query(dataQuery, queryParams);

    return NextResponse.json({
      success: true,
      invoices: dataResult.rows,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (error) {
    console.error("Failed to fetch invoice listings:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
