// app/api/lookups/locations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.company_id) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const companyId = session.user.company_id;
  const { searchParams } = new URL(req.url);

  // Filters
  const warehouseId = searchParams.get("warehouse_id") || "";
  const search = searchParams.get("search") || "";
  const code = searchParams.get("code") || "";
  const title = searchParams.get("title") || "";
  const type = searchParams.get("type") || "";

  // Pagination parameters
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 20);
  const offset = (page - 1) * limit;

  // Initialize query parameters array with company scoped check
  const values: (string | number)[] = [companyId];

  // Base scope conditions
  let where = `
    WHERE wl.company_id = $1
    AND wl.status = 1
  `;

  // Specific warehouse filter (passed from your template string query)
  if (warehouseId) {
    values.push(warehouseId);
    where += ` AND wl.warehouse_id = $${values.length}`;
  }

  // Combined text search for global filtering components
  if (search) {
    values.push(`%${search}%`);
    where += `
      AND (
        wl.code ILIKE $${values.length}
        OR wl.title ILIKE $${values.length}
      )
    `;
  }

  // Field specific filters
  if (code) {
    values.push(`%${code}%`);
    where += ` AND wl.code ILIKE $${values.length}`;
  }

  if (title) {
    values.push(`%${title}%`);
    where += ` AND wl.title ILIKE $${values.length}`;
  }

  if (type) {
    values.push(type);
    where += ` AND wl.type = $${values.length}`;
  }

  try {
    // 1. Get total record count for pagination metadata
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM warehouse_locations wl
      ${where}
    `;

    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0].total;

    // 2. Append limit and offset parameters to the argument list
    values.push(limit);
    values.push(offset);

    // 3. Main Data Query (fetching fields relevant to standard selection lookups)
    const query = `
      SELECT
        wl.id,
        wl.warehouse_id,
        wl.parent_id,
        wl.type,
        wl.title,
        wl.code,
        wl.is_primary,
        wl.capacity,
        p_wl.title AS parent_location_title
      FROM warehouse_locations wl
      LEFT JOIN warehouse_locations p_wl 
        ON p_wl.id = wl.parent_id
      ${where}
      ORDER BY wl.title ASC, wl.code ASC
      LIMIT $${values.length - 1}
      OFFSET $${values.length}
    `;

    const result = await pool.query(query, values);

    return NextResponse.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error loading warehouse locations:", err);
    return NextResponse.json(
      {
        error: "Failed to load locations",
      },
      {
        status: 500,
      },
    );
  }
}
