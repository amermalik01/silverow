// app/api/purchase-invoices/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { QueryResultRow } from "pg";

import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

interface PurchaseInvoiceListRow extends QueryResultRow {
  id: string;
  posting_date: string | null;
  invoice_date: string | null;
  due_date: string | null;
  invoice_no: string | null;
  supplier_invoice_no: string | null;
  currency_code: string;
  amount: string | number;
  vat_amount: string | number;
  total_amount: string | number;
  status: string;
  purchase_order_id: string;
  supplier_name: string | null;
  supplier_no: string | null;
  purchase_order_no: string;
  invoice_status: string | null;
  is_posted: boolean;
  is_invoiced: boolean;
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  max?: number,
): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return max ? Math.min(parsed, max) : parsed;
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

    const supplierId = searchParams.get("supplier_id");
    const page = parsePositiveInteger(searchParams.get("page"), 1);
    const limit = parsePositiveInteger(searchParams.get("limit"), 10, 100);

    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";

    const offset = (page - 1) * limit;

    const client = await pool.connect();

    try {
      /* ============================================================
         1. BUILD FILTERS
      ============================================================ */

      const whereConditions: string[] = [
        "po.company_id = $1",
        "COALESCE(po.is_invoiced, false) = true",
        "COALESCE(po.is_posted, false) = true",
      ];

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
            po.purchase_invoice_no ILIKE $${paramCounter}
            OR po.supplier_invoice_no ILIKE $${paramCounter}
            OR po.order_no ILIKE $${paramCounter}
            OR p.name ILIKE $${paramCounter}
            OR p.supplier_code ILIKE $${paramCounter}
          )
        `);

        queryParams.push(`%${search}%`);
        paramCounter++;
      }

      if (status) {
        whereConditions.push(`po.invoice_status = $${paramCounter}`);

        queryParams.push(status);
        paramCounter++;
      }

      const whereClause = whereConditions.join(" AND ");

      /* ============================================================
         2. COUNT RECORDS
      ============================================================ */

      const countRes = await client.query<{ count: string }>(
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

      const totalRecords = Number(countRes.rows[0]?.count ?? 0);

      /* ============================================================
         3. FETCH PURCHASE INVOICES
      ============================================================ */

      const listRes = await client.query<PurchaseInvoiceListRow>(
        `
            SELECT
              po.id,

              po.posting_date,

              po.invoice_date,

              po.due_date,

              po.purchase_invoice_no AS invoice_no,

              po.supplier_invoice_no,

              COALESCE(c.code, 'GBP') AS currency_code,

              COALESCE(po.subtotal, 0) AS amount,

              COALESCE(
                po.vat_amount,
                po.tax_amount,
                0
              ) AS vat_amount,

              COALESCE(po.total_amount, 0) AS total_amount,

              COALESCE(
                po.invoice_status,
                'INVOICED'
              ) AS status,

              po.purchase_order_id,

              p.name AS supplier_name,

              p.supplier_code AS supplier_no,

              po.order_no AS purchase_order_no,

              po.invoice_status,

              po.is_posted,

              po.is_invoiced

            FROM purchase_orders po

            LEFT JOIN parties p
              ON p.id = po.supplier_id
             AND p.company_id = po.company_id

            LEFT JOIN currencies c
              ON c.id = po.currency_id

            WHERE ${whereClause}

            ORDER BY
              po.posting_date DESC NULLS LAST,
              po.invoice_date DESC NULLS LAST,
              po.created_at DESC

            LIMIT $${paramCounter}
            OFFSET $${paramCounter + 1}
          `,
        [...queryParams, limit, offset],
      );

      /* ============================================================
         4. RESPONSE
      ============================================================ */

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
    console.error("[LIST_PURCHASE_INVOICES_ERROR]:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load purchase invoices.",
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
    const supplierId = searchParams.get("supplier_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const offset = (page - 1) * limit;

    const client = await pool.connect();

    try {
      const whereConditions: string[] = ["pi.company_id = $1"];
      const queryParams: unknown[] = [companyId];
      let paramCounter = 2;

      // 1. Filter by Supplier ID
      if (supplierId) {
        whereConditions.push(`pi.supplier_id = $${paramCounter}`);
        queryParams.push(supplierId);
        paramCounter++;
      }

      if (search) {
        whereConditions.push(
          `(pi.invoice_no ILIKE $${paramCounter} OR pi.supplier_invoice_no ILIKE $${paramCounter} OR po.order_no ILIKE $${paramCounter} OR p.name ILIKE $${paramCounter})`,
        );
        queryParams.push(`%${search}%`);
        paramCounter++;
      }

      if (status) {
        whereConditions.push(`pi.status = $${paramCounter}`);
        queryParams.push(status);
        paramCounter++;
      }

      const whereClause = whereConditions.join(" AND ");

      const countRes = await client.query(
        `SELECT COUNT(*) 
         FROM purchase_invoices pi 
         LEFT JOIN parties p ON p.id = pi.supplier_id 
         LEFT JOIN purchase_orders po ON po.id = pi.purchase_order_id 
         WHERE ${whereClause}`,
        queryParams,
      );

      const totalRecords = parseInt(countRes.rows[0].count, 10);

      // List Query with Property Mapping for Frontend Components
      const listRes = await client.query(
        `SELECT 
           pi.id,
           pi.invoice_date AS posting_date,
           pi.invoice_no,
           pi.supplier_invoice_no,
           COALESCE(c.code, 'GBP') AS currency_code,
           pi.subtotal AS amount,
           pi.tax_amount AS vat_amount,
           pi.total_amount,
           pi.status,
           pi.purchase_order_id,
           p.name AS supplier_name,
           p.supplier_code AS supplier_no,
           po.order_no AS purchase_order_no
         FROM purchase_invoices pi
         LEFT JOIN parties p ON p.id = pi.supplier_id
         LEFT JOIN purchase_orders po ON po.id = pi.purchase_order_id
         LEFT JOIN currencies c ON c.id = pi.currency_id
         WHERE ${whereClause}
         ORDER BY pi.invoice_date DESC, pi.created_at DESC
         LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`,
        [...queryParams, limit, offset]
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
    console.error("[LIST_PURCHASE_INVOICES_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load purchase invoices." },
      { status: 500 },
    );
  }
} */
