// app/api/reports/unposted-sales-orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Filter Parameters
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const reportType = searchParams.get("reportType") || "By Order Date"; // 'By Order Date' or 'By Posting Date'

  // Multi-select arrays (comma separated IDs passed from the client)
  const customerIds = searchParams.get("customerIds")
    ? searchParams.get("customerIds")?.split(",")
    : [];
  const salespersonIds = searchParams.get("salespersonIds")
    ? searchParams.get("salespersonIds")?.split(",")
    : [];
  const orderStageIds = searchParams.get("orderStageIds")
    ? searchParams.get("orderStageIds")?.split(",")
    : [];

  const queryParams: unknown[] = [companyId];

  // Base constraints: matching company context and explicitly unposted records
  let whereClause = `
    WHERE so.company_id = $1 
    AND so.is_posted = false
  `;

  // Date Filter logic assignment based on UI Report Type preference dropdown
  if (fromDate && toDate) {
    queryParams.push(fromDate, toDate);
    if (reportType === "By Order Date") {
      whereClause += ` AND so.order_date BETWEEN $${queryParams.length - 1} AND $${queryParams.length}`;
    } else {
      // Fallback fallback to created_at window if filtered by posting/entry criteria
      whereClause += ` AND so.created_at::date BETWEEN $${queryParams.length - 1} AND $${queryParams.length}`;
    }
  }

  // Multi-Select Query Filters
  if (customerIds && customerIds.length > 0) {
    queryParams.push(customerIds);
    whereClause += ` AND so.customer_id = ANY($${queryParams.length})`;
  }

  if (salespersonIds && salespersonIds.length > 0) {
    queryParams.push(salespersonIds);
    whereClause += ` AND so.created_by = ANY($${queryParams.length})`; // maps to user/employee tracking column
  }

  if (orderStageIds && orderStageIds.length > 0) {
    queryParams.push(orderStageIds);
    // Assuming you have an order_stage_id mapping column in your production schema setup
    whereClause += ` AND so.status = ANY($${queryParams.length})`;
  }

  try {
    const dataQuery = `
      SELECT 
        so.id,
        so.order_date,
        so.order_no,
        -- cust.customer_no AS cust_no,
        cust.name AS customer_name,
        COALESCE(emp.display_name, emp.first_name || ' ' || emp.last_name) AS salesperson,
        so.requested_delivery_date AS req_delivery_date,
        so.dispatched_at::date AS delivery_date,
        
        -- Calculated Local Currency (LCY) metrics derived from exchange_rate factor
        (so.subtotal * so.exchange_rate) AS amount_lcy,
        (so.total_amount * so.exchange_rate) AS amount_incl_vat_lcy,
        
        -- Fallback to string status field text if lookup stages relation isn't linked
        COALESCE(stage.name, so.status) AS order_stage
      FROM public.sales_orders so
      LEFT JOIN public.customers cust ON so.customer_id = cust.id
      LEFT JOIN public.employees emp ON so.created_by = emp.id
      LEFT JOIN public.common_order_stages stage ON so.status = stage.id::text OR so.status = stage.stage_type
      ${whereClause}
      ORDER BY so.order_date DESC, so.order_no DESC
    `;

    const result = await pool.query(dataQuery, queryParams);

    return NextResponse.json({
      data: result.rows,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate Unposted Sales Orders Report data matrix" },
      { status: 500 },
    );
  }
}
