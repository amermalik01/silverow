// /app/api/sales/sales-orders/[id]/convert-to-invoice/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

import { getCompanyId } from "@/lib/auth/getCompanyId";

import { SalesInvoiceService } from "@/lib/services/sales-invoices/sales-invoice.service";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: NextRequest, context: Context) {
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

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const invoice = await SalesInvoiceService.createFromSalesOrder(
      client,
      companyId,
      id,
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      invoice_id: invoice.id,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Conversion failed",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}
