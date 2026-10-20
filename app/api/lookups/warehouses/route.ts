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

    const search = (
      searchParams.get("q") ||
      searchParams.get("search") ||
      ""
    ).trim();
    const code = searchParams.get("code")?.trim() || "";
    const name = searchParams.get("name")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";
    const itemId = searchParams.get("itemId")?.trim() || "";

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "10", 10)),
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

    let itemFilterSql = "";
    if (itemId) {
      values.push(itemId);
      itemFilterSql = ` AND item_id = $${values.length}`;
    }

    values.push(limit);
    const limitIdx = values.length;

    values.push(offset);
    const offsetIdx = values.length;

    const query = `
      WITH physical_summary AS (
        SELECT 
          ile.warehouse_id,
          SUM(CASE WHEN ile.direction = 'IN' THEN ile.quantity ELSE -ile.quantity END) AS physical_qty
        FROM inventory_ledger_entries ile
        WHERE ile.company_id = $1 ${itemId ? `AND ile.item_id = $2` : ""}
        GROUP BY ile.warehouse_id
      ),
      allocation_summary AS (
        SELECT 
          ia.warehouse_id,
          SUM(ia.allocated_quantity) AS allocated_qty
        FROM inventory_allocations ia
        WHERE ia.company_id = $1 AND ia.status = 'ACTIVE' ${itemId ? `AND ia.item_id = $2` : ""}
        GROUP BY ia.warehouse_id
      ),
      base_warehouses AS (
        SELECT
          w.id,
          w.code,
          w.name,
          w.type,
          w.status,
          wl.title AS primary_location_name,
          COALESCE(ps.physical_qty, 0) AS total_stock,
          COALESCE(als.allocated_qty, 0) AS allocated_stock,
          GREATEST(0, COALESCE(ps.physical_qty, 0) - COALESCE(als.allocated_qty, 0)) AS available_stock
        FROM warehouses w
        LEFT JOIN warehouse_locations wl ON wl.id = w.primary_location_id
        LEFT JOIN physical_summary ps ON ps.warehouse_id = w.id
        LEFT JOIN allocation_summary als ON als.warehouse_id = w.id
        ${where}
      )
      SELECT 
        id,
        code,
        name,
        type,
        status,
        primary_location_name,
        total_stock,
        allocated_stock,
        available_stock,
        COUNT(*) OVER() AS total_count
      FROM base_warehouses
      ORDER BY code ASC
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
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
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
} */
