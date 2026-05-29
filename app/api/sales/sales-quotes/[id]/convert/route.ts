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

    const orderMetadata = await SalesQuoteConversionService.convertToOrder(
      client,
      companyId,
      id,
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      message: `Successfully generated Sales Order ${orderMetadata.order_no}`,
      orderId: orderMetadata.id,
      orderNo: orderMetadata.order_no,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    const dbError = err as { code?: string; message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to convert quote to order" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
