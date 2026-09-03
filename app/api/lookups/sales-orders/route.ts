// app/api/lookups/sales-orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));

    const limit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
    );

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const offset = (page - 1) * limit;

    const client = await pool.connect();

    try {
      const whereConditions: string[] = ["so.company_id = $1"];
      const queryParams: unknown[] = [companyId];
      let paramCounter = 2;

      if (search) {
        whereConditions.push(`
          (
            so.order_no ILIKE $${paramCounter}
            OR si.invoice_no ILIKE $${paramCounter}
            OR so.customer_no ILIKE $${paramCounter}
            OR p.name ILIKE $${paramCounter}
          )
        `);
        queryParams.push(`%${search}%`);
        paramCounter++;
      }

      if (status) {
        whereConditions.push(`
          (
            CASE
              WHEN si.id IS NOT NULL THEN si.status
              ELSE so.status::text
            END
          ) = $${paramCounter}
        `);
        queryParams.push(status);
        paramCounter++;
      }

      const whereClause = whereConditions.join(" AND ");

      // Count query for pagination calculation
      const countRes = await client.query(
        `
        SELECT COUNT(*)
        FROM sales_orders so
        LEFT JOIN sales_invoices si
          ON si.sales_order_id = so.id
         AND si.company_id = so.company_id
        LEFT JOIN parties p
          ON p.id = so.customer_id
        WHERE ${whereClause}
        `,
        queryParams,
      );

      const totalRecords = parseInt(countRes.rows[0].count, 10);

      // Data query matching SalesOrderLookupItem interface
      const listRes = await client.query(
        `
        SELECT
          so.id AS sales_order_id,
          si.id AS sales_invoice_id,
          COALESCE(si.id, so.id) AS id,

          CASE
            WHEN si.id IS NOT NULL THEN 'invoice'
            ELSE 'sales_order'
          END AS document_type,

          COALESCE(
            si.invoice_date,
            so.posting_date,
            so.order_date
          ) AS posting_date,

          so.order_no,
          si.invoice_no,
          p.name AS customer_name,
          so.customer_no,
          COALESCE(
            ci.code,
            co.code,
            'GBP'
          ) AS currency_code,

          COALESCE(
            si.subtotal,
            so.subtotal,
            0
          )::float AS amount,

          COALESCE(
            si.vat_amount,
            so.vat_amount,
            0
          )::float AS vat_amount,

          COALESCE(
            si.total_amount,
            so.total_amount,
            0
          )::float AS total_amount,

          CASE
            WHEN si.id IS NOT NULL THEN si.status
            ELSE so.status::text
          END AS status,

          CASE
            WHEN si.id IS NOT NULL THEN COALESCE(si.is_posted, false)
            ELSE COALESCE(so.is_posted, false)
          END AS is_posted,

          (si.id IS NOT NULL) AS has_invoice,
          (si.id IS NULL) AS has_invoice_pending

        FROM sales_orders so
        LEFT JOIN sales_invoices si
          ON si.sales_order_id = so.id
         AND si.company_id = so.company_id
        LEFT JOIN parties p
          ON p.id = so.customer_id
        LEFT JOIN currencies co
          ON co.id = so.currency_id
        LEFT JOIN currencies ci
          ON ci.id = si.currency_id
        WHERE ${whereClause}
        ORDER BY
          COALESCE(
            si.invoice_date,
            so.posting_date,
            so.order_date
          ) DESC,
          COALESCE(
            si.created_at,
            so.created_at
          ) DESC
        LIMIT $${paramCounter}
        OFFSET $${paramCounter + 1}
        `,
        [...queryParams, limit, offset],
      );

      return NextResponse.json({
        success: true,
        data: listRes.rows,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(totalRecords / limit) || 1,
        },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[LIST_SALES_ORDERS_INVOICES_ERROR]:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load sales orders/invoices.",
      },
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
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10),
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        parseInt(searchParams.get("limit") || "50", 10),
      ),
    );

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const offset = (page - 1) * limit;

    const client = await pool.connect();

    try {
      const whereConditions: string[] = [
        "so.company_id = $1",
      ];

      const queryParams: unknown[] = [companyId];
      let paramCounter = 2;


      if (search) {
        whereConditions.push(`
          (
            so.order_no ILIKE $${paramCounter}
            OR si.invoice_no ILIKE $${paramCounter}
            OR so.customer_no ILIKE $${paramCounter}
            OR p.name ILIKE $${paramCounter}
          )
        `);

        queryParams.push(`%${search}%`);
        paramCounter++;
      }


      if (status) {
        whereConditions.push(`
          (
            CASE
              WHEN si.id IS NOT NULL
                THEN si.status
              ELSE so.status::text
            END
          ) = $${paramCounter}
        `);

        queryParams.push(status);
        paramCounter++;
      }

      const whereClause = whereConditions.join(" AND ");


      const countRes = await client.query(
        `
        SELECT COUNT(*)
        FROM sales_orders so

        LEFT JOIN sales_invoices si
          ON si.sales_order_id = so.id
         AND si.company_id = so.company_id

        LEFT JOIN parties p
          ON p.id = so.customer_id

        WHERE ${whereClause}
        `,
        queryParams,
      );

      const totalRecords = parseInt(
        countRes.rows[0].count,
        10,
      );

   
      const listRes = await client.query(
        `
        SELECT

          so.id AS sales_order_id,
          si.id AS sales_invoice_id,
          COALESCE(si.id, so.id) AS id,

          CASE
            WHEN si.id IS NOT NULL
              THEN 'invoice'
            ELSE 'sales_order'
          END AS document_type,

          COALESCE(
            si.invoice_date,
            so.posting_date,
            so.order_date
          ) AS posting_date,

          so.order_no,
          si.invoice_no,
          p.name AS customer_name,
          so.customer_no,
          COALESCE(
            ci.code,
            co.code,
            'GBP'
          ) AS currency_code,

          COALESCE(
            si.subtotal,
            so.subtotal,
            0
          ) AS amount,

          COALESCE(
            si.vat_amount,
            so.vat_amount,
            0
          ) AS vat_amount,

          COALESCE(
            si.total_amount,
            so.total_amount,
            0
          ) AS total_amount,

          CASE
            WHEN si.id IS NOT NULL
              THEN si.status
            ELSE so.status::text
          END AS status,

          CASE
            WHEN si.id IS NOT NULL
              THEN si.is_posted
            ELSE so.is_posted
          END AS is_posted,

          (si.id IS NOT NULL) AS has_invoice,
          (si.id IS NULL) AS has_invoice_pending

        FROM sales_orders so

        LEFT JOIN sales_invoices si
          ON si.sales_order_id = so.id
         AND si.company_id = so.company_id

        LEFT JOIN parties p
          ON p.id = so.customer_id

        LEFT JOIN currencies co
          ON co.id = so.currency_id

        LEFT JOIN currencies ci
          ON ci.id = si.currency_id

        WHERE ${whereClause}

        ORDER BY
          COALESCE(
            si.invoice_date,
            so.posting_date,
            so.order_date
          ) DESC,

          COALESCE(
            si.created_at,
            so.created_at
          ) DESC

        LIMIT $${paramCounter}
        OFFSET $${paramCounter + 1}
        `,
        [
          ...queryParams,
          limit,
          offset,
        ],
      );

      return NextResponse.json({
        success: true,
        data: listRes.rows,
        pagination: {
          page,
          limit,
          totalRecords,
          totalPages: Math.ceil(
            totalRecords / limit,
          ),
        },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(
      "[LIST_SALES_ORDERS_INVOICES_ERROR]:",
      err,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Failed to load sales orders/invoices.",
      },
      { status: 500 },
    );
  }
} */
