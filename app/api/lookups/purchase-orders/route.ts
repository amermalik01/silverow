// app/api/lookups/purchase-orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

interface CountRow extends QueryResultRow {
  count: string;
}

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
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "50", 10) || 50),
    );

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const supplierId = searchParams.get("supplier_id")?.trim() || "";
    const offset = (page - 1) * limit;

    const whereConditions: string[] = ["po.company_id = $1"];
    const queryParams: (string | number)[] = [companyId];
    let paramCounter = 2;

    if (supplierId) {
      whereConditions.push(`po.supplier_id = $${paramCounter}`);
      queryParams.push(supplierId);
      paramCounter++;
    }

    if (search) {
      whereConditions.push(`
        (
          po.order_no ILIKE $${paramCounter}
          OR po.purchase_invoice_no ILIKE $${paramCounter}
          OR po.supplier_invoice_no ILIKE $${paramCounter}
          OR po.supplier_no ILIKE $${paramCounter}
          OR po.supplier_name ILIKE $${paramCounter}
          OR p.name ILIKE $${paramCounter}
          OR p.supplier_code ILIKE $${paramCounter}
        )
      `);

      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    if (status) {
      whereConditions.push(`
        (
          CASE
            WHEN po.invoice_status = 'INVOICED'
              THEN po.invoice_status
            ELSE po.status::text
          END
        ) = $${paramCounter}
      `);

      queryParams.push(status);
      paramCounter++;
    }

    const whereClause = whereConditions.join(" AND ");

    const countResult = await pool.query<CountRow>(
      `
      SELECT COUNT(*)::text AS count
      FROM purchase_orders po

      LEFT JOIN parties p
        ON p.id = po.supplier_id
       AND p.company_id = po.company_id

      WHERE ${whereClause}
      `,
      queryParams,
    );

    const totalRecords = Number.parseInt(countResult.rows[0]?.count || "0", 10);

    const listResult = await pool.query(
      `
      SELECT
        po.id AS purchase_order_id,

        CASE
          WHEN po.invoice_status = 'INVOICED'
            THEN po.id
          ELSE NULL
        END AS purchase_invoice_id,

        po.id,

        CASE
          WHEN po.invoice_status = 'INVOICED'
            THEN 'invoice'
          ELSE 'purchase_order'
        END AS document_type,

        COALESCE(
          po.invoice_date,
          po.order_date
        ) AS posting_date,

        po.order_no,

        po.purchase_invoice_no AS invoice_no,
        po.purchase_invoice_no AS invoice_code,
        po.supplier_invoice_no,

        COALESCE(
          po.supplier_name,
          p.name
        ) AS supplier_name,

        COALESCE(
          po.supplier_no,
          p.supplier_code
        ) AS supplier_no,

        COALESCE(c.code, 'GBP') AS currency_code,

        COALESCE(po.subtotal, 0) AS amount,
        COALESCE(
          NULLIF(po.tax_amount, 0),
          po.vat_amount,
          0
        ) AS vat_amount,

        COALESCE(po.total_amount, 0) AS total_amount,

        CASE
          WHEN po.invoice_status = 'INVOICED'
            THEN po.invoice_status
          ELSE po.status::text
        END AS status,

        po.is_posted,

        (po.invoice_status = 'INVOICED') AS has_invoice,

        (po.invoice_status IS DISTINCT FROM 'INVOICED')
          AS has_invoice_pending,

        po.invoice_status,
        po.is_invoiced

      FROM purchase_orders po

      LEFT JOIN parties p
        ON p.id = po.supplier_id
       AND p.company_id = po.company_id

      LEFT JOIN currencies c
        ON c.id = po.currency_id

      WHERE ${whereClause}

      ORDER BY
        COALESCE(po.invoice_date, po.order_date) DESC NULLS LAST,
        po.created_at DESC

      LIMIT $${paramCounter}
      OFFSET $${paramCounter + 1}
      `,
      [...queryParams, limit, offset],
    );

    return NextResponse.json({
      success: true,
      data: listResult.rows,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (err) {
    console.error("[LIST_PURCHASE_ORDERS_INVOICES_ERROR]:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load purchase orders/invoices.",
      },
      { status: 500 },
    );
  }
}

/* 
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
      Math.max(1, parseInt(searchParams.get("limit") || "50", 10)),
    );

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const supplierId = searchParams.get("supplier_id")?.trim() || "";
    const offset = (page - 1) * limit;

    const client = await pool.connect();

    try {
      const whereConditions: string[] = ["po.company_id = $1"];
      const queryParams: unknown[] = [companyId];
      let paramCounter = 2;

      if (supplierId) {
        whereConditions.push(`po.supplier_id = $${paramCounter}`);
        queryParams.push(supplierId);
        paramCounter++;
      }

      if (search) {
        whereConditions.push(`
          (
            po.order_no ILIKE $${paramCounter}
            OR pi.invoice_no ILIKE $${paramCounter}
            OR pi.supplier_invoice_no ILIKE $${paramCounter}
            OR po.supplier_no ILIKE $${paramCounter}
            OR po.supplier_name ILIKE $${paramCounter}
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
              WHEN pi.id IS NOT NULL
                THEN pi.status::text
              ELSE po.status::text
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
        FROM purchase_orders po
        LEFT JOIN purchase_invoices pi
          ON pi.purchase_order_id = po.id
         AND pi.company_id = po.company_id
        LEFT JOIN parties p
          ON p.id = po.supplier_id
        WHERE ${whereClause}
        `,
        queryParams,
      );

      const totalRecords = parseInt(countRes.rows[0].count, 10);

      const listRes = await client.query(
        `
        SELECT
          po.id AS purchase_order_id,
          pi.id AS purchase_invoice_id,
          COALESCE(pi.id, po.id) AS id,
          CASE
            WHEN pi.id IS NOT NULL THEN 'invoice'
            ELSE 'purchase_order'
          END AS document_type,
          COALESCE(
            pi.invoice_date,
            po.order_date
          ) AS posting_date,
          po.order_no,
          pi.invoice_no,
          pi.supplier_invoice_no,
          COALESCE(
            p.name,
            po.supplier_name
          ) AS supplier_name,
          COALESCE(
            p.supplier_code,
            po.supplier_no
          ) AS supplier_no,
          COALESCE(
            ci.code,
            co.code,
            'GBP'
          ) AS currency_code,
          COALESCE(
            pi.subtotal,
            po.subtotal,
            0
          ) AS amount,
          COALESCE(
            pi.tax_amount,
            po.tax_amount,
            0
          ) AS vat_amount,
          COALESCE(
            pi.total_amount,
            po.total_amount,
            0
          ) AS total_amount,
          CASE
            WHEN pi.id IS NOT NULL
              THEN pi.status::text
            ELSE po.status::text
          END AS status,
          CASE
            WHEN pi.id IS NOT NULL
              THEN pi.is_posted
            ELSE po.is_posted
          END AS is_posted,
          (pi.id IS NOT NULL) AS has_invoice,
          (pi.id IS NULL) AS has_invoice_pending

        FROM purchase_orders po

        LEFT JOIN purchase_invoices pi
          ON pi.purchase_order_id = po.id
         AND pi.company_id = po.company_id

        LEFT JOIN parties p
          ON p.id = po.supplier_id

        LEFT JOIN currencies co
          ON co.id = po.currency_id

        LEFT JOIN currencies ci
          ON ci.id = pi.currency_id

        WHERE ${whereClause}

        ORDER BY
          COALESCE(pi.invoice_date, po.order_date) DESC,
          COALESCE(pi.created_at, po.created_at) DESC

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
          totalPages: Math.ceil(totalRecords / limit),
        },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[LIST_PURCHASE_ORDERS_INVOICES_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load purchase orders/invoices." },
      { status: 500 },
    );
  }
} */
