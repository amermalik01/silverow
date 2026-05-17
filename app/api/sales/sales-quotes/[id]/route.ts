// app/api/sales/sales-quotes/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, context: Context) {
  const { id } = await context.params;

  const quoteResult = await pool.query(
    `
    SELECT *
    FROM sales_quotes
    WHERE id = $1
    `,
    [id],
  );

  const linesResult = await pool.query(
    `
    SELECT *
    FROM sales_quote_lines
    WHERE sales_quote_id = $1
    ORDER BY line_no ASC
    `,
    [id],
  );

  return NextResponse.json({
    quote: quoteResult.rows[0] || null,

    lines: linesResult.rows,
  });
}

export async function PUT(req: NextRequest, context: Context) {
  const { id } = await context.params;

  const body = await req.json();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `
      UPDATE sales_quotes
      SET
        customer_id = $1,
        quote_date = $2,
        expiry_date = $3,
        subtotal = $4,
        total_amount = $5,
        updated_at = now()
      WHERE id = $6
      `,
      [
        body.quote.customer_id,
        body.quote.quote_date,
        body.quote.expiry_date || null,
        body.quote.subtotal || 0,
        body.quote.total_amount || 0,
        id,
      ],
    );

    await client.query(
      `
      DELETE FROM sales_quote_lines
      WHERE sales_quote_id = $1
      `,
      [id],
    );

    for (let i = 0; i < body.lines.length; i++) {
      const line = body.lines[i];

      await client.query(
        `
        INSERT INTO sales_quote_lines (
          company_id,
          sales_quote_id,
          line_no,
          item_id,
          description,
          quantity,
          unit_price,
          line_total,
          warehouse_id
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9
        )
        `,
        [
          body.quote.company_id,
          id,
          i + 1,
          line.item_id || null,
          line.description || null,
          line.quantity,
          line.unit_price,
          line.line_total || 0,
          line.warehouse_id || null,
        ],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    await client.query("ROLLBACK");

    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Update failed",
      },
      {
        status: 500,
      },
    );
  } finally {
    client.release();
  }
}
