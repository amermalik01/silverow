// app/api/lookups/default-warehouse/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("item_id");

    /*
      CASE 1:
      Fetch default warehouse when selecting ITEM

      Priority:
      1. Item specific warehouse mapping (if available)
      2. Company default warehouse
    */

    if (itemId) {
      //   const itemWarehouseResult = await pool.query(
      //     `
      //     SELECT
      //       w.id,
      //       w.code,
      //       w.name
      //     FROM item_warehouses iw
      //     INNER JOIN warehouses w
      //       ON w.id = iw.warehouse_id

      //     WHERE
      //       iw.item_id = $1
      //       AND w.company_id = $2
      //       AND w.status = 1

      //     ORDER BY
      //       iw.is_default DESC,
      //       w.is_default DESC
      //     LIMIT 1
      //     `,
      //     [itemId, companyId],
      //   );

      const itemWarehouseResult = await pool.query(
        `
        SELECT
            w.id,
            w.code,
            w.name
        FROM item_warehouses iw
        INNER JOIN warehouses w ON w.id = iw.warehouse_id
        WHERE
            iw.company_id=$1
            AND iw.item_id=$2
            AND iw.is_default=true
            AND iw.status=1
            AND w.status=1
        LIMIT 1
        `,
        [companyId, itemId],
      );

      if (itemWarehouseResult.rows.length) {
        return NextResponse.json({
          data: itemWarehouseResult.rows[0],
        });
      }

      /*
        Fallback:
        Company default warehouse
      */

      const defaultWarehouseResult = await pool.query(
        `
        SELECT
          w.id,
          w.code,
          w.name
        FROM warehouses w
        WHERE
          w.company_id = $1
          AND w.status = 1
          AND w.is_default = true

        ORDER BY w.created_at ASC
        LIMIT 1
        `,
        [companyId],
      );

      return NextResponse.json({
        data: defaultWarehouseResult.rows[0] || null,
      });
    }

    /*
      CASE 2:
      Normal warehouse lookup list
    */

    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const code = searchParams.get("code") || "";
    const name = searchParams.get("name") || "";
    const type = searchParams.get("type") || "";
    const values: (string | number | null)[] = [companyId];

    let where = `
      WHERE
        w.company_id = $1
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

    const countResult = await pool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM warehouses w
        ${where}
        `,
      values,
    );

    const total = countResult.rows[0].total;

    values.push(limit);
    values.push(offset);

    const result = await pool.query(
      `
        SELECT
          w.id,
          w.code,
          w.name,
          w.type,
          w.status,
          w.is_default,
          wl.title AS primary_location_name

        FROM warehouses w

        LEFT JOIN warehouse_locations wl
          ON wl.id = w.primary_location_id

        ${where}

        ORDER BY
          w.is_default DESC,
          w.code ASC
        LIMIT $${values.length - 1}
        OFFSET $${values.length}

        `,
      values,
    );

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
    console.error("Warehouse lookup error:", err);

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
