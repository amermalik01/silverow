// app/api/sales/sales-orders/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

import { getCompanyId } from "@/lib/auth/getCompanyId";

import { SalesOrderPayload } from "@/types/sales-order";

import { SalesOrderService } from "@/lib/services/sales/sales-order.service";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, context: Context) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    /**
     * =====================================================
     * ORDER
     * =====================================================
     */

    const orderResult = await pool.query(
      `
      SELECT
        so.*,

        p.name AS customer_name

      FROM sales_orders so

      LEFT JOIN parties p
        ON p.id = so.customer_id

      WHERE so.company_id = $1
      AND so.id = $2
      `,
      [companyId, id],
    );

    if (!orderResult.rows.length) {
      return NextResponse.json(
        {
          error: "Sales order not found",
        },
        {
          status: 404,
        },
      );
    }

    /**
     * =====================================================
     * LINES
     * =====================================================
     */

    const linesResult = await pool.query(
      `
      SELECT
        sol.*,

        i.item_code,
        i.name AS item_name,

        w.code AS warehouse_code,
        w.name AS warehouse_name,

        ga.code AS account_code,
        ga.name AS account_name

      FROM sales_order_lines sol

      LEFT JOIN items i
        ON i.id = sol.item_id

      LEFT JOIN warehouses w
        ON w.id = sol.warehouse_id

      LEFT JOIN chart_of_accounts ga
        ON ga.id = sol.gl_account_id

      WHERE sol.sales_order_id = $1

      ORDER BY sol.line_no ASC
      `,
      [id],
    );

    /**
     * =====================================================
     * BILLING ADDRESS
     * =====================================================
     */

    const billingResult = await pool.query(
      `
      SELECT *
      FROM sales_order_addresses
      WHERE sales_order_id = $1
      AND address_type = 'billing'
      LIMIT 1
      `,
      [id],
    );

    /**
     * =====================================================
     * SHIPPING ADDRESS
     * =====================================================
     */

    const shippingResult = await pool.query(
      `
      SELECT *
      FROM sales_order_addresses
      WHERE sales_order_id = $1
      AND address_type = 'shipping'
      LIMIT 1
      `,
      [id],
    );

    return NextResponse.json({
      order: orderResult.rows[0],

      lines: linesResult.rows,

      billing_address: billingResult.rows[0] || null,

      shipping_address: shippingResult.rows[0] || null,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load sales order",
      },
      {
        status: 500,
      },
    );
  }
}

export async function PUT(req: NextRequest, context: Context) {
  const client = await pool.connect();

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    const payload = (await req.json()) as SalesOrderPayload;

    await client.query("BEGIN");

    /**
     * =====================================================
     * UPDATE ORDER
     * =====================================================
     */

    await SalesOrderService.update(
      client,
      companyId,
      id,
      payload,
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,

    //   id: order.id,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update sales order",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}

export async function DELETE(req: NextRequest, context: Context) {
  const client = await pool.connect();

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const { id } = await context.params;

    await client.query("BEGIN");

    /**
     * =====================================================
     * DELETE ORDER
     * =====================================================
     */

    await SalesOrderService.delete(client, companyId, id);

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to delete sales order",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}
