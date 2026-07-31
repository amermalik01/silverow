// app/api/sales/sales-orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesOrderPayload } from "@/types/sales-order";
import { SalesOrderService } from "@/lib/services/sales/sales-order.service";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10"));
    const offset = (page - 1) * limit;

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    const queryParams: (string | number)[] = [companyId];
    let whereClause = `WHERE so.company_id = $1`;

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (so.order_no ILIKE $${queryParams.length} OR p.name ILIKE $${queryParams.length})`;
    }

    if (status) {
      queryParams.push(status);
      whereClause += ` AND so.status = $${queryParams.length}`;
    }

    if (startDate) {
      queryParams.push(startDate);
      whereClause += ` AND so.order_date >= $${queryParams.length}`;
    }

    if (endDate) {
      queryParams.push(endDate);
      whereClause += ` AND so.order_date <= $${queryParams.length}`;
    }

    const countQuery = `
      SELECT COUNT(DISTINCT so.id) as total
      FROM sales_orders so
      LEFT JOIN parties p ON p.id = so.customer_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0");

    queryParams.push(limit, offset);
    const dataQuery = `
      SELECT
        so.id,
        so.order_no,
        so.order_date,
        so.status,
        so.total_amount,
        so.shipment_status,
        so.invoice_status,
        p.name AS customer_name,
        COALESCE(SUM(sol.quantity), 0) AS ordered_qty,
        COALESCE(SUM(sol.quantity_shipped), 0) AS shipped_qty,
        COALESCE(SUM(sol.quantity_invoiced), 0) AS invoiced_qty,
        COALESCE(SUM(sol.quantity) - SUM(COALESCE(sol.quantity_shipped, 0)), 0) AS remaining_qty
      FROM sales_orders so
      LEFT JOIN parties p ON p.id = so.customer_id
      LEFT JOIN sales_order_lines sol ON sol.sales_order_id = so.id
      ${whereClause}
      GROUP BY so.id, p.name
      ORDER BY so.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const dataResult = await pool.query(dataQuery, queryParams);

    return NextResponse.json({
      rows: dataResult.rows,
      meta: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load sales orders" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as SalesOrderPayload;

    await client.query("BEGIN");

    const seqResult = await client.query(
      `SELECT get_next_sequence($1, $2) AS code`,
      [companyId, "sales_order"],
    );
    const orderNo: string = seqResult.rows[0].code;

    const order = await SalesOrderService.create(
      client,
      companyId,
      payload,
      orderNo,
    );

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      id: order.id,
      order_no: order.order_no,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create sales order",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

import { SalesOrderPayload } from "@/types/sales-order";
import { SalesOrderService } from "@/lib/services/sales/sales-order.service";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Extract query params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10"));
    const offset = (page - 1) * limit;

    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const startDate = searchParams.get("startDate") || "";
    const endDate = searchParams.get("endDate") || "";

    // 2. Build dynamic parameters and WHERE filters
    const queryParams: (string | number)[] = [companyId];
    let whereClause = `WHERE so.company_id = $1`;

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (so.order_no ILIKE $${queryParams.length} OR p.name ILIKE $${queryParams.length})`;
    }

    if (status) {
      queryParams.push(status);
      whereClause += ` AND so.status = $${queryParams.length}`;
    }

    if (startDate) {
      queryParams.push(startDate);
      whereClause += ` AND so.order_date >= $${queryParams.length}`;
    }

    if (endDate) {
      queryParams.push(endDate);
      whereClause += ` AND so.order_date <= $${queryParams.length}`;
    }

    // 3. Count query for pagination meta totals
    const countQuery = `
      SELECT COUNT(DISTINCT so.id) as total
      FROM sales_orders so
      LEFT JOIN parties p ON p.id = so.customer_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0");

    // 4. Rows data fetch query with pagination limits appended
    queryParams.push(limit, offset);
    const dataQuery = `
      SELECT
        so.id,
        so.order_no,
        so.order_date,
        so.status,
        so.total_amount,
        p.name AS customer_name,
        COALESCE(SUM(sol.quantity), 0) AS ordered_qty,
        COALESCE(SUM(sol.quantity_shipped), 0) AS shipped_qty,
        COALESCE(SUM(sol.quantity_invoiced), 0) AS invoiced_qty,
        COALESCE(SUM(sol.quantity) - SUM(COALESCE(sol.quantity_shipped, 0)), 0) AS remaining_qty
      FROM sales_orders so
      LEFT JOIN parties p ON p.id = so.customer_id
      LEFT JOIN sales_order_lines sol ON sol.sales_order_id = so.id
      ${whereClause}
      GROUP BY so.id, p.name
      ORDER BY so.created_at DESC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const dataResult = await pool.query(dataQuery, queryParams);

    return NextResponse.json({
      rows: dataResult.rows,
      meta: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load sales orders" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = (await req.json()) as SalesOrderPayload;

    if (!payload.order.customer_id) throw new Error("Customer is required");
    if (!payload.lines?.length)
      throw new Error("At least one line is required");

    await client.query("BEGIN");

    const seqResult = await client.query(
      `SELECT get_next_sequence($1, $2) AS code`,
      [companyId, "sales_order"],
    );
    const orderNo: string = seqResult.rows[0].code;

    const order = await SalesOrderService.create(
      client,
      companyId,
      payload,
      orderNo,
    );

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      id: order.id,
      order_no: order.order_no,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to create sales order",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
} */
