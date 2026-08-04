// app/api/lookups/items/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 20);

  const offset = (page - 1) * limit;

  const search = searchParams.get("search") || "";
  const item_code = searchParams.get("item_code") || "";
  const barcode = searchParams.get("barcode") || "";
  const name = searchParams.get("name") || "";
  const item_type = searchParams.get("item_type") || "";

  const values: (string | number | boolean)[] = [companyId];

  let where = `
    WHERE i.company_id = $1
    AND i.deleted_at IS NULL
    AND i.status = 1
  `;

  if (search) {
    values.push(`%${search}%`);

    where += `
      AND (
        i.item_code ILIKE $${values.length}
        OR i.name ILIKE $${values.length}
        OR i.barcode ILIKE $${values.length}
      )
    `;
  }

  if (item_code) {
    values.push(`%${item_code}%`);

    where += `
      AND i.item_code ILIKE $${values.length}
    `;
  }

  if (barcode) {
    values.push(`%${barcode}%`);

    where += `
      AND i.barcode ILIKE $${values.length}
    `;
  }

  if (name) {
    values.push(`%${name}%`);

    where += `
      AND i.name ILIKE $${values.length}
    `;
  }

  if (item_type) {
    values.push(Number(item_type));

    where += `
      AND i.item_type = $${values.length}
    `;
  }

  try {
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM items i
      ${where}
    `;

    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0].total;

    values.push(limit);
    values.push(offset);

    const query = `
      SELECT
        i.id,
        i.item_code,
        i.barcode,
        i.name,
        i.description,

        i.item_type,

        i.standard_cost,
        i.standard_sales_price,

        i.inventory_gl_id,
        i.purchase_gl_id,
        i.vat_product_group_id,
        i.sales_gl_id,
        i.cogs_gl_id,

        i.base_uom_id,

        u.name AS base_uom_name

      FROM items i

      LEFT JOIN uoms u
        ON u.id = i.base_uom_id

      ${where}

      ORDER BY i.item_code ASC

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
        error: "Failed to load items",
      },
      {
        status: 500,
      },
    );
  }
}
