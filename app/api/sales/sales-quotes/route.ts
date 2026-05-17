// app/api/sales/sales-quotes/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

import { SalesQuotePayload } from "@/types/sales-quote";

import { SalesQuoteService } from "@/lib/services/sales/sales-quote.service";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  const result = await pool.query(`
    SELECT *
    FROM sales_quotes
    ORDER BY created_at DESC
  `);

  return NextResponse.json({
    rows: result.rows,
  });
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const payload = (await req.json()) as SalesQuotePayload;

    await client.query("BEGIN");

    /**
     * -----------------------------------------------------
     * GENERATE sales quotation NUMBER
     * -----------------------------------------------------
     */
    const seqResult = await client.query(
      `
      SELECT get_next_sequence($1,$2) AS code
      `,
      [companyId, "sales_quotation"],
    );

    const quoteNo = seqResult.rows[0].code;

    const quote = await SalesQuoteService.create(
      client,
      payload.quote.customer_id,
      payload,
      quoteNo,
    );

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      id: quote.id,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Save failed",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}
