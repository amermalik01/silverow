// app/api/sales/sales-quotes/[id]/convert/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { SalesQuoteService } from "@/lib/services/sales/sales-quote.service";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { authOptions } from "@/lib/auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    // const userId = req.headers.get("x-user-id") || undefined;
    const session = await getServerSession(authOptions);
    const userId = session?.user.id;

    const { id } = await params;

    if (!companyId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await SalesQuoteService.convertToSalesOrder(
      companyId,
      id,
      userId,
    );

    return NextResponse.json({
      success: true,
      message: "Quote successfully converted to Sales Order",
      data: result,
    });
  } catch (err) {
    // return NextResponse.json({ error: error.message }, { status: 400 });
    const dbError = err as { code?: string; message?: string };
    return NextResponse.json(
      { error: dbError.message || "Conversion failed" },
      { status: 500 },
    );
  }
}

/* import { NextResponse } from "next/server";

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
} */
