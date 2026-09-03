// app/api/lookups/warehouses/route.ts

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

    // Support both unified query parameter `q` and standard `search`
    const search = (searchParams.get("q") || searchParams.get("search") || "").trim();
    const code = searchParams.get("code")?.trim() || "";
    const name = searchParams.get("name")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "10", 10))
    );
    const offset = (page - 1) * limit;

    const values: (string | number)[] = [companyId];

    let where = `
      WHERE w.company_id = $1
        AND w.status = 1
    `;

    if (search) {
      values.push(`%${search}%`);
      where += `
        AND (
          w.code ILIKE $${values.length}
          OR w.name ILIKE $${values.length}
          OR wl.title ILIKE $${values.length}
        )
      `;
    }

    if (code) {
      values.push(`%${code}%`);
      where += ` AND w.code ILIKE $${values.length}`;
    }

    if (name) {
      values.push(`%${name}%`);
      where += ` AND w.name ILIKE $${values.length}`;
    }

    if (type) {
      values.push(type);
      where += ` AND w.type = $${values.length}`;
    }

    values.push(limit);
    const limitIdx = values.length;

    values.push(offset);
    const offsetIdx = values.length;

    const query = `
      SELECT
        w.id,
        w.code,
        w.name,
        w.type,
        w.status,
        wl.title AS primary_location_name,
        COUNT(*) OVER() AS total_count
      FROM warehouses w
      LEFT JOIN warehouse_locations wl
        ON wl.id = w.primary_location_id
      ${where}
      ORDER BY w.code ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const result = await pool.query(query, values);

    const total =
      result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error("Error loading warehouses lookup:", err);
    return NextResponse.json(
      { error: "Failed to load warehouses" },
      { status: 500 }
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  const companyId = await getCompanyId();
  const { searchParams } = new URL(req.url);
  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 20);
  const offset = (page - 1) * limit;
  const search = searchParams.get("search") || "";
  const code = searchParams.get("code") || "";
  const name = searchParams.get("name") || "";
  const type = searchParams.get("type") || "";

  const values: (string | number | null)[] = [companyId];

  let where = `
    WHERE w.company_id = $1
    AND w.status = 1
  `;

  if (search) {
    values.push(`%${search}%`);
    where += `
      AND (
        w.code ILIKE $${values.length}
        OR w.name ILIKE $${values.length}
      )
    `;
  }

  if (code) {
    values.push(`%${code}%`);
    where += `
      AND w.code ILIKE $${values.length}
    `;
  }

  if (name) {
    values.push(`%${name}%`);
    where += `
      AND w.name ILIKE $${values.length}
    `;
  }

  if (type) {
    values.push(type);
    where += `
      AND w.type = $${values.length}
    `;
  }

  try {
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM warehouses w
      ${where}
    `;

    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0].total;
    values.push(limit);
    values.push(offset);

    const query = `
      SELECT
        w.id,
        w.code,
        w.name,
        w.type,
        w.status,
        wl.title AS primary_location_name
      FROM warehouses w
      LEFT JOIN warehouse_locations wl
        ON wl.id = w.primary_location_id
      ${where}
      ORDER BY w.code ASC
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
    console.error(err);
    return NextResponse.json(
      {
        error: "Failed to load warehouses",
      },
      {
        status: 500,
      },
    );
  }
}
 */