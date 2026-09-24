// /app/api/sales/sales-returns/sales-invoices-list/route.ts

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
    const customerId = searchParams.get("customer_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const offset = (page - 1) * limit;

    const client = await pool.connect();

    try {
      // Filter for posted sales orders that act as invoices
      const whereConditions: string[] = [
        "so.company_id = $1",
        "so.is_posted = true",
      ];
      const queryParams: unknown[] = [companyId];
      let paramCounter = 2;

      // 1. Filter by Customer ID
      if (customerId) {
        whereConditions.push(`so.customer_id = $${paramCounter}`);
        queryParams.push(customerId);
        paramCounter++;
      }

      // 2. Search filter (Invoice No, Order No, Customer Name/No)
      if (search) {
        whereConditions.push(
          `(so.sales_invoice_no ILIKE $${paramCounter} OR so.order_no ILIKE $${paramCounter} OR so.customer_name ILIKE $${paramCounter} OR so.customer_no ILIKE $${paramCounter})`,
        );
        queryParams.push(`%${search}%`);
        paramCounter++;
      }

      const whereClause = whereConditions.join(" AND ");

      const countRes = await client.query(
        `SELECT COUNT(*) 
         FROM sales_orders so 
         WHERE ${whereClause}`,
        queryParams,
      );

      const totalRecords = parseInt(countRes.rows[0].count, 10);

      const listRes = await client.query(
        `SELECT 
           so.id,
           COALESCE(so.posting_date, so.order_date) AS posting_date,
           COALESCE(so.sales_invoice_no, so.order_no) AS sales_invoice_no,
           so.order_no,
           COALESCE(c.code, 'GBP') AS currency_code,
           so.subtotal AS amount,
           so.vat_amount,
           so.total_amount,
           so.customer_id,
           so.customer_no,
           so.customer_name
         FROM sales_orders so
         LEFT JOIN currencies c ON c.id = so.currency_id
         WHERE ${whereClause}
         ORDER BY so.posting_date DESC, so.created_at DESC
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
    console.error("[LIST_SALES_INVOICES_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load sales invoices." },
      { status: 500 },
    );
  }
}
