// app/api/reports/unposted-purchase-orders/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

interface PurchaseOrderLineReport {
  id: string;
  item_code: string;
  item_name: string;
  description: string;
  quantity: number;
  unit_cost: number;
  net_amount: number;
  gross_amount: number;
}

interface UnpostedPOReportHeader {
  id: string;
  order_date: string;
  posting_date: string | null;
  order_no: string;
  supplier_no: string;
  supplier_name: string;
  req_receipt_date: string | null;
  receipt_date: string | null;
  shipping_city: string;
  amount_lcy: number;
  amount_incl_vat_lcy: number;
  lines?: PurchaseOrderLineReport[];
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // Query Parameters (Accepts startDate/endDate from client)
    const fromDate = searchParams.get("startDate") || searchParams.get("fromDate");
    const toDate = searchParams.get("endDate") || searchParams.get("toDate");
    const reportType = searchParams.get("reportType") || "By Order Date"; 
    const viewMode = searchParams.get("viewMode") || "summary"; 
    
    // Multi-select filters
    const purchasersParam = searchParams.get("purchaserIds");
    const suppliersParam = searchParams.get("supplierIds");
    const itemsParam = searchParams.get("itemIds");
    const glAccountsParam = searchParams.get("glAccountIds");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "'From Date' and 'To Date' parameters are required." },
        { status: 400 }
      );
    }

    const queryParams: unknown[] = [companyId];
    const whereConditions: string[] = [
      "po.company_id = $1",
      "po.is_posted = false", 
    ];

    // 1. Date Filtering Logic
    const dateField = reportType === "By Posting Date" ? "po.created_at::date" : "po.order_date";
    
    queryParams.push(fromDate);
    whereConditions.push(`${dateField} >= $${queryParams.length}`);

    queryParams.push(toDate);
    whereConditions.push(`${dateField} <= $${queryParams.length}`);

    // 2. Purchaser Filter
    if (purchasersParam) {
      const purchaserIds = purchasersParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (purchaserIds.length > 0) {
        queryParams.push(purchaserIds);
        whereConditions.push(`po.purchaser_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    // 3. Supplier Filter
    if (suppliersParam) {
      const supplierIds = suppliersParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (supplierIds.length > 0) {
        queryParams.push(supplierIds);
        whereConditions.push(`po.supplier_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    // 4. Line-level Item & G/L Account Filters
    const lineConditions: string[] = ["pol.is_deleted = false"];
    
    if (itemsParam) {
      const itemIds = itemsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (itemIds.length > 0) {
        queryParams.push(itemIds);
        lineConditions.push(`pol.item_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    if (glAccountsParam) {
      const glAccountIds = glAccountsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (glAccountIds.length > 0) {
        queryParams.push(glAccountIds);
        lineConditions.push(`pol.gl_account_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    if (itemsParam || glAccountsParam) {
      whereConditions.push(`
        EXISTS (
          SELECT 1 FROM purchase_order_lines pol 
          WHERE pol.purchase_order_id = po.id AND ${lineConditions.join(" AND ")}
        )
      `);
    }

    // 5. Query Headers
    const headersQuery = `
      SELECT 
        po.id,
        po.order_date,
        po.created_at::date AS posting_date,
        po.order_no,
        po.supplier_no,
        p.name AS supplier_name,
        po.req_receipt_date,
        po.receipt_date,
        COALESCE(addr.city, '') AS shipping_city,
        po.net_amount * po.exchange_rate AS amount_lcy,
        po.total_amount * po.exchange_rate AS amount_incl_vat_lcy
      FROM purchase_orders po
      LEFT JOIN parties p ON p.id = po.supplier_id
      LEFT JOIN purchase_order_addresses addr 
        ON addr.purchase_order_id = po.id 
       AND addr.address_type = 'shipping'
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY ${dateField} ASC, po.order_no ASC
    `;

    const headersResult = await pool.query(headersQuery, queryParams);
    const orders: UnpostedPOReportHeader[] = headersResult.rows;

    // 6. Detailed Mode: Fetch Order Lines
    if (viewMode === "detailed" && orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      
      const linesQueryParams: unknown[] = [orderIds];
      const detailLineConditions = ["pol.purchase_order_id = ANY($1::uuid[])", "pol.is_deleted = false"];

      if (itemsParam) {
        const itemIds = itemsParam.split(",").map((id) => id.trim()).filter(Boolean);
        if (itemIds.length > 0) {
          linesQueryParams.push(itemIds);
          detailLineConditions.push(`pol.item_id = ANY($${linesQueryParams.length}::uuid[])`);
        }
      }

      if (glAccountsParam) {
        const glAccountIds = glAccountsParam.split(",").map((id) => id.trim()).filter(Boolean);
        if (glAccountIds.length > 0) {
          linesQueryParams.push(glAccountIds);
          detailLineConditions.push(`pol.gl_account_id = ANY($${linesQueryParams.length}::uuid[])`);
        }
      }

      const linesQuery = `
        SELECT 
          pol.purchase_order_id,
          pol.id,
          COALESCE(pol.item_code, pol.account_code, '') AS item_code,
          COALESCE(pol.item_name, pol.description, '') AS item_name,
          pol.description,
          pol.quantity,
          pol.unit_cost,
          pol.net_amount * po.exchange_rate AS net_amount,
          pol.gross_amount * po.exchange_rate AS gross_amount
        FROM purchase_order_lines pol
        JOIN purchase_orders po ON po.id = pol.purchase_order_id
        WHERE ${detailLineConditions.join(" AND ")}
        ORDER BY pol.line_no ASC
      `;

      const linesResult = await pool.query(linesQuery, linesQueryParams);

      const linesMap: Record<string, PurchaseOrderLineReport[]> = {};
      linesResult.rows.forEach((line) => {
        if (!linesMap[line.purchase_order_id]) {
          linesMap[line.purchase_order_id] = [];
        }
        linesMap[line.purchase_order_id].push({
          id: line.id,
          item_code: line.item_code,
          item_name: line.item_name,
          description: line.description,
          quantity: Number(line.quantity),
          unit_cost: Number(line.unit_cost),
          net_amount: Number(line.net_amount),
          gross_amount: Number(line.gross_amount),
        });
      });

      orders.forEach((order) => {
        order.lines = linesMap[order.id] || [];
      });
    }

    const totalAmountLcy = orders.reduce((sum, o) => sum + Number(o.amount_lcy || 0), 0);
    const totalAmountInclVatLcy = orders.reduce((sum, o) => sum + Number(o.amount_incl_vat_lcy || 0), 0);

    return NextResponse.json({
      success: true,
      data: {
        report_meta: {
          title: "Unposted Purchase Orders Report",
          start_date: fromDate,
          end_date: toDate,
          report_type: reportType,
          view_mode: viewMode,
          total_orders: orders.length,
          total_amount_lcy: totalAmountLcy,
          total_amount_incl_vat_lcy: totalAmountInclVatLcy,
        },
        orders,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate Unposted Purchase Orders Report" },
      { status: 500 }
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

interface PurchaseOrderLineReport {
  id: string;
  item_code: string;
  item_name: string;
  description: string;
  quantity: number;
  unit_cost: number;
  net_amount: number;
  gross_amount: number;
}

interface UnpostedPOReportHeader {
  id: string;
  order_date: string;
  posting_date: string | null;
  order_no: string;
  supplier_no: string;
  supplier_name: string;
  req_receipt_date: string | null;
  receipt_date: string | null;
  shipping_city: string;
  amount_lcy: number;
  amount_incl_vat_lcy: number;
  lines?: PurchaseOrderLineReport[];
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    // Query Parameters
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const reportType = searchParams.get("reportType") || "By Order Date"; // 'By Order Date' | 'By Posting Date'
    const viewMode = searchParams.get("viewMode") || "summary"; // 'summary' | 'detailed'
    
    // Multi-select filters
    const purchasersParam = searchParams.get("purchaserIds");
    const suppliersParam = searchParams.get("supplierIds");
    const itemsParam = searchParams.get("itemIds");
    const glAccountsParam = searchParams.get("glAccountIds");

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "'From Date' and 'To Date' parameters are required." },
        { status: 400 }
      );
    }

    const queryParams: unknown[] = [companyId];
    const whereConditions: string[] = [
      "po.company_id = $1",
      "po.is_posted = false", // Only Unposted POs
    ];

    // 1. Date Filtering Logic
    const dateField = reportType === "By Posting Date" ? "po.created_at::date" : "po.order_date";
    
    queryParams.push(fromDate);
    whereConditions.push(`${dateField} >= $${queryParams.length}`);

    queryParams.push(toDate);
    whereConditions.push(`${dateField} <= $${queryParams.length}`);

    // 2. Purchaser Filter
    if (purchasersParam) {
      const purchaserIds = purchasersParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (purchaserIds.length > 0) {
        queryParams.push(purchaserIds);
        whereConditions.push(`po.purchaser_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    // 3. Supplier Filter
    if (suppliersParam) {
      const supplierIds = suppliersParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (supplierIds.length > 0) {
        queryParams.push(supplierIds);
        whereConditions.push(`po.supplier_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    // 4. Line-level Item & G/L Account Filters
    const lineConditions: string[] = ["pol.is_deleted = false"];
    
    if (itemsParam) {
      const itemIds = itemsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (itemIds.length > 0) {
        queryParams.push(itemIds);
        lineConditions.push(`pol.item_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    if (glAccountsParam) {
      const glAccountIds = glAccountsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (glAccountIds.length > 0) {
        queryParams.push(glAccountIds);
        lineConditions.push(`pol.gl_account_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    // If item/GL filters are applied, constrain the header query using EXISTS
    if (itemsParam || glAccountsParam) {
      whereConditions.push(`
        EXISTS (
          SELECT 1 FROM purchase_order_lines pol 
          WHERE pol.purchase_order_id = po.id AND ${lineConditions.join(" AND ")}
        )
      `);
    }

    // 5. Query Headers
    const headersQuery = `
      SELECT 
        po.id,
        po.order_date,
        po.created_at::date AS posting_date,
        po.order_no,
        po.supplier_no,
        p.name AS supplier_name,
        po.req_receipt_date,
        po.receipt_date,
        COALESCE(addr.city, '') AS shipping_city,
        po.net_amount * po.exchange_rate AS amount_lcy,
        po.total_amount * po.exchange_rate AS amount_incl_vat_lcy
      FROM purchase_orders po
      LEFT JOIN parties p ON p.id = po.supplier_id
      LEFT JOIN purchase_order_addresses addr 
        ON addr.purchase_order_id = po.id 
       AND addr.address_type = 'shipping'
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY ${dateField} ASC, po.order_no ASC
    `;

    const headersResult = await pool.query(headersQuery, queryParams);
    const orders: UnpostedPOReportHeader[] = headersResult.rows;

    // 6. Detailed Mode: Fetch Order Lines
    if (viewMode === "detailed" && orders.length > 0) {
      const orderIds = orders.map((o) => o.id);
      
      const linesQueryParams: unknown[] = [orderIds];
      const detailLineConditions = ["pol.purchase_order_id = ANY($1::uuid[])", "pol.is_deleted = false"];

      if (itemsParam) {
        const itemIds = itemsParam.split(",").map((id) => id.trim()).filter(Boolean);
        if (itemIds.length > 0) {
          linesQueryParams.push(itemIds);
          detailLineConditions.push(`pol.item_id = ANY($${linesQueryParams.length}::uuid[])`);
        }
      }

      if (glAccountsParam) {
        const glAccountIds = glAccountsParam.split(",").map((id) => id.trim()).filter(Boolean);
        if (glAccountIds.length > 0) {
          linesQueryParams.push(glAccountIds);
          detailLineConditions.push(`pol.gl_account_id = ANY($${linesQueryParams.length}::uuid[])`);
        }
      }

      const linesQuery = `
        SELECT 
          pol.purchase_order_id,
          pol.id,
          COALESCE(pol.item_code, pol.account_code, '') AS item_code,
          COALESCE(pol.item_name, pol.description, '') AS item_name,
          pol.description,
          pol.quantity,
          pol.unit_cost,
          pol.net_amount * po.exchange_rate AS net_amount,
          pol.gross_amount * po.exchange_rate AS gross_amount
        FROM purchase_order_lines pol
        JOIN purchase_orders po ON po.id = pol.purchase_order_id
        WHERE ${detailLineConditions.join(" AND ")}
        ORDER BY pol.line_no ASC
      `;

      const linesResult = await pool.query(linesQuery, linesQueryParams);

      // Group lines by purchase_order_id
      const linesMap: Record<string, PurchaseOrderLineReport[]> = {};
      linesResult.rows.forEach((line) => {
        if (!linesMap[line.purchase_order_id]) {
          linesMap[line.purchase_order_id] = [];
        }
        linesMap[line.purchase_order_id].push({
          id: line.id,
          item_code: line.item_code,
          item_name: line.item_name,
          description: line.description,
          quantity: Number(line.quantity),
          unit_cost: Number(line.unit_cost),
          net_amount: Number(line.net_amount),
          gross_amount: Number(line.gross_amount),
        });
      });

      // Attach lines to respective headers
      orders.forEach((order) => {
        order.lines = linesMap[order.id] || [];
      });
    }

    // Calculate Summary Aggregates
    const totalAmountLcy = orders.reduce((sum, o) => sum + Number(o.amount_lcy || 0), 0);
    const totalAmountInclVatLcy = orders.reduce((sum, o) => sum + Number(o.amount_incl_vat_lcy || 0), 0);

    return NextResponse.json({
      success: true,
      meta: {
        total_orders: orders.length,
        total_amount_lcy: totalAmountLcy,
        total_amount_incl_vat_lcy: totalAmountInclVatLcy,
        report_type: reportType,
        view_mode: viewMode,
      },
      data: orders,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate Unposted Purchase Orders Report" },
      { status: 500 }
    );
  }
} */