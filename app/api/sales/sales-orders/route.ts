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

    // const payload = (await req.json()) as SalesOrderPayload;
    const body = await req.json();
    const { lines } = body;

    await client.query("BEGIN");

    // const seqResult = await client.query(
    //   `SELECT get_next_sequence($1, $2) AS code`,
    //   [companyId, "sales_order"],
    // );
    // const orderNo: string = seqResult.rows[0].code;
    const createdOrder = await SalesOrderService.create(companyId, body);

    // 🌟 FIX: Add a runtime check to satisfy strict TypeScript constraints
    if (!createdOrder || !createdOrder.id) {
      throw new Error(
        "Failed to generate a valid purchase order identification sequence.",
      );
    }

    const purchaseOrderID: string = createdOrder.id;

    // 2. Fetch the newly created lines to extract their primary key IDs
    // const savedLinesResult = await client.query(
    //   `SELECT id, item_id, warehouse_id, line_no FROM purchase_order_lines 
    //        WHERE purchase_order_id = $1 AND is_deleted = false ORDER BY line_no`,
    //   [purchaseOrderID],
    // );

    // // 3. Match payload lines to real database IDs and save allocations
    // for (let i = 0; i < lines.length; i++) {
    //   const payloadLine = lines[i];
    //   const dbLine = savedLinesResult.rows[i];

    //   if (dbLine && payloadLine.allocations?.length > 0) {
    //     await SalesOrderService.saveLineAllocations(
    //       client,
    //       companyId,
    //       purchaseOrderID,
    //       dbLine.id,
    //       dbLine.item_id,
    //       dbLine.warehouse_id,
    //       payloadLine.allocations,
    //     );
    //   }
    // }

    // const order = await SalesOrderService.create(
    //   client,
    //   companyId,
    //   payload,
    //   orderNo,
    // );

    await client.query("COMMIT");
    return NextResponse.json(
      { success: true, data: createdOrder },
      { status: 201 },
    );
    // return NextResponse.json({
    //   success: true,
    //   id: order.id,
    //   order_no: order.order_no,
    // });
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
