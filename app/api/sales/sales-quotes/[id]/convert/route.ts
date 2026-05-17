// app/api/sales/sales-quotes/[id]/convert/route.ts

import { NextResponse } from "next/server";

import { pool } from "@/lib/db";

import { getCompanyId } from "@/lib/auth/getCompanyId";

import { SalesQuoteConversionService } from "@/lib/services/sales/sales-quote-conversion.service";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_: Request, context: Context) {
  const client = await pool.connect();

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    await client.query("BEGIN");

    const order = await SalesQuoteConversionService.convertToOrder(
      client,
      companyId,
      id,
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      order_id: order.id,
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
