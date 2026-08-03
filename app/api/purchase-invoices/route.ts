// app/api/purchase-invoices/route.ts

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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const offset = (page - 1) * limit;

    const client = await pool.connect();

    try {
      let whereConditions = ["pi.company_id = $1"];
      let queryParams: any[] = [companyId];
      let paramCounter = 2;

      if (search) {
        whereConditions.push(
          `(pi.invoice_no ILIKE $${paramCounter} OR pi.supplier_invoice_no ILIKE $${paramCounter} OR po.order_no ILIKE $${paramCounter} OR p.name ILIKE $${paramCounter})`
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
        queryParams
      );

      const totalRecords = parseInt(countRes.rows[0].count);

      const listRes = await client.query(
        `SELECT 
          pi.*,
          p.name AS supplier_name,
          p.supplier_code AS supplier_no,
          po.order_no AS purchase_order_no
         FROM purchase_invoices pi
         LEFT JOIN parties p ON p.id = pi.supplier_id
         LEFT JOIN purchase_orders po ON po.id = pi.purchase_order_id
         WHERE ${whereClause}
         ORDER BY pi.created_at DESC
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
      { status: 500 }
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { PurchaseInvoiceService } from "@/lib/services/purchase-invoices/purchase-invoice.service";

export async function GET(request: NextRequest) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Extract search matrix strings out of the incoming URL query payload
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const result = await PurchaseInvoiceService.list(companyId, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      status,
      startDate,
      endDate,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    console.error("Purchase invoice list error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load purchase invoices",
      },
      {
        status: 500,
      },
    );
  }
} */
