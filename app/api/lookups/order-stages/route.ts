// app/api/lookups/order-stages/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Pagination constraints parameters
  const fetchAll = searchParams.get("all") === "true";
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 20);
  const offset = (page - 1) * limit;

  // Search parameters
  const search = searchParams.get("search") || "";
  const name = searchParams.get("name") || "";
  const stageType = searchParams.get("stage_type") || ""; // 'sales_order', 'credit_note', etc.

  // Type-safe array instantiation avoiding eslint 'prefer-const' & 'any' issues
  const queryParams: unknown[] = [companyId];

  let whereClause = `
    WHERE cos.company_id = $1
  `;

  if (stageType) {
    queryParams.push(stageType);
    whereClause += ` AND cos.stage_type = $${queryParams.length}`;
  }

  if (search) {
    queryParams.push(`%${search}%`);
    whereClause += ` AND cos.name ILIKE $${queryParams.length}`;
  }

  if (name) {
    queryParams.push(`%${name}%`);
    whereClause += ` AND cos.name ILIKE $${queryParams.length}`;
  }

  try {
    // Count processing pipeline execution
    const countQuery = `SELECT COUNT(*)::int AS total FROM common_order_stages cos ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = countResult.rows[0].total;

    let dataQuery = `
      SELECT 
        cos.id, 
        cos.stage_type, 
        cos.name, 
        cos.rank
      FROM common_order_stages cos
      ${whereClause}
      ORDER BY cos.rank ASC, cos.name ASC
    `;

    if (!fetchAll) {
      queryParams.push(limit);
      queryParams.push(offset);
      dataQuery += ` LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`;
    }

    const result = await pool.query(dataQuery, queryParams);

    return NextResponse.json({
      data: result.rows,
      pagination: fetchAll
        ? null
        : {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load order workflow stages" },
      { status: 500 },
    );
  }
}
