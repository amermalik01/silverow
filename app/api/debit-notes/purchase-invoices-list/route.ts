// app/api/debit-notes/purchase-invoices-list/route.ts

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
    console.error("[LIST_PURCHASE_INVOICES_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load purchase invoices." },
      { status: 500 },
    );
  }
}
