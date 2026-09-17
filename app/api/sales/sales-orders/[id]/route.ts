// app/api/sales/sales-orders/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesOrderService } from "@/lib/services/sales/sales-order.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const data = await SalesOrderService.get(companyId, id);

    if (!data) {
      return NextResponse.json(
        {
          success: false,
          error: "Sales order not found",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Sales order get error:", err);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load sales order",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { lines } = body;

    await client.query("BEGIN");

    // 1. Core update operation
    const dbLines = await SalesOrderService.update(client, companyId, id, body);

    // 2. Iterate safely using order indexes to map stock allocations accurately
    if (lines && Array.isArray(lines)) {
      for (let i = 0; i < lines.length; i++) {
        const payloadLine = lines[i];
        const matchedDbLine = dbLines[i];

        if (matchedDbLine && payloadLine.allocations) {
          await SalesOrderService.saveLineAllocations(
            client,
            companyId,
            id,
            matchedDbLine.id,
            matchedDbLine.item_id,
            matchedDbLine.warehouse_id,
            payloadLine.allocations || [],
          );
        }
      }
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Sales order update transactional engine crash:", err);

    const errorMessage =
      err instanceof Error
        ? err.message
        : "Failed to update sales order pipeline";

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    await SalesOrderService.delete(companyId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Sales order delete error:", err);

    return NextResponse.json(
      {
        success: false,
        error:
          err instanceof Error ? err.message : "Failed to delete sales order",
      },
      {
        status: 500,
      },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { SalesOrderPayload } from "@/types/sales-order";
import { SalesOrderService } from "@/lib/services/sales/sales-order.service";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, context: Context) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;

    // Fetch Header with joined fields
    const orderResult = await pool.query(
      `
      SELECT so.*, so.vat_amount as vat_amount, p.name AS customer_name
      FROM sales_orders so
      LEFT JOIN parties p ON p.id = so.customer_id
      WHERE so.company_id = $1 AND so.id = $2
      `,
      [companyId, id],
    );

    if (!orderResult.rows.length) {
      return NextResponse.json(
        { error: "Sales order not found" },
        { status: 404 },
      );
    }

    // Fetch Lines with updated DB metadata references
    const linesResult = await pool.query(
      `
      SELECT
        sol.*,
        sol.vat_percent as tax_percent,
        sol.vat_amount as vat_amount,
        sol.line_amount as total_amount,
        i.item_code, i.name AS item_name,
        u.name AS uom_name,
        w.code AS warehouse_code, w.name AS warehouse_name,
        ga.code AS account_code, ga.name AS account_name
      FROM sales_order_lines sol
      LEFT JOIN items i ON i.id = sol.item_id
      LEFT JOIN uoms u ON u.id = sol.uom_id
      LEFT JOIN warehouses w ON w.id = sol.warehouse_id
      LEFT JOIN chart_of_accounts ga ON ga.id = sol.gl_account_id
      WHERE sol.sales_order_id = $1
      ORDER BY sol.line_no ASC
      `,
      [id],
    );

    const primaryResult = await pool.query(
      `SELECT * FROM sales_order_addresses WHERE sales_order_id = $1 AND address_type = 'primary' LIMIT 1`,
      [id],
    );

    const billingResult = await pool.query(
      `SELECT * FROM sales_order_addresses WHERE sales_order_id = $1 AND address_type = 'billing' LIMIT 1`,
      [id],
    );

    const shippingResult = await pool.query(
      `SELECT * FROM sales_order_addresses WHERE sales_order_id = $1 AND address_type = 'shipping' LIMIT 1`,
      [id],
    );

    return NextResponse.json({
      order: orderResult.rows[0],
      lines: linesResult.rows,
      primary_address: primaryResult.rows[0] || null,
      billing_address: billingResult.rows[0] || null,
      shipping_address: shippingResult.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to load sales order" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest, context: Context) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const payload = (await req.json()) as SalesOrderPayload;

    await client.query("BEGIN");
    await SalesOrderService.update(client, companyId, id, payload);
    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update sales order",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;

    await client.query("BEGIN");
    await SalesOrderService.delete(client, companyId, id);
    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to delete sales order",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
} */
