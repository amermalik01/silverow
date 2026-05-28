// app/api/sales/sales-orders/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

import { getCompanyId } from "@/lib/auth/getCompanyId";

import { SalesOrderPayload } from "@/types/sales-order";

import { SalesOrderService } from "@/lib/services/sales/sales-order.service";

export async function GET() {
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

    const result = await pool.query(
      `
      SELECT
        so.id,
        so.order_no,
        so.order_date,
        so.status,
        so.invoice_status,
        so.total_amount,
        so.invoiced_amount,

        p.name AS customer_name,

        COALESCE(SUM(sol.quantity),0) AS ordered_qty,

        COALESCE(SUM(sol.shipped_quantity),0) AS shipped_qty,

        COALESCE(SUM(sol.invoiced_quantity),0) AS invoiced_qty,

        COALESCE(
          SUM(sol.quantity)
          -
          SUM(
            COALESCE(sol.shipped_quantity,0)
          ),
          0
        ) AS remaining_qty,

        MAX(si.id) AS sales_invoice_id

      FROM sales_orders so

      LEFT JOIN parties p
        ON p.id = so.customer_id

      LEFT JOIN sales_order_lines sol
        ON sol.sales_order_id = so.id

      LEFT JOIN sales_invoice_lines sil
        ON sil.sales_order_line_id = sol.id

      LEFT JOIN sales_invoices si
        ON si.id = sil.sales_invoice_id

      WHERE so.company_id = $1

      GROUP BY
        so.id,
        p.name

      ORDER BY so.created_at DESC
      `,
      [companyId],
    );

    /*     
    
      SELECT
        so.*,

        p.name AS customer_name,

        (
          SELECT COUNT(*)
          FROM sales_order_lines sol
          WHERE sol.sales_order_id = so.id
        ) AS total_lines

      FROM sales_orders so

      LEFT JOIN parties p
        ON p.id = so.customer_id

      WHERE so.company_id = $1

      ORDER BY so.created_at DESC
    */

    return NextResponse.json({
      rows: result.rows,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        error: "Failed to load sales orders",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(req: NextRequest) {
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

    const payload =
      (await req.json()) as SalesOrderPayload;

    /**
     * =====================================================
     * BASIC VALIDATION
     * =====================================================
     */

    if (!payload.order.customer_id) {
      throw new Error("Customer is required");
    }

    if (!payload.lines?.length) {
      throw new Error("At least one line is required");
    }

    await client.query("BEGIN");

    /**
     * =====================================================
     * GENERATE ORDER NUMBER
     * =====================================================
     */

    const seqResult = await client.query(
      `
      SELECT get_next_sequence($1,$2) AS code
      `,
      [companyId, "sales_order"],
    );

    const orderNo: string =
      seqResult.rows[0].code;

    /**
     * =====================================================
     * CREATE ORDER
     * =====================================================
     */

    const order =
      await SalesOrderService.create(
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
          err instanceof Error
            ? err.message
            : "Failed to create sales order",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}