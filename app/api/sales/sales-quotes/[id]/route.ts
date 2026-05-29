// app/api/sales/sales-quotes/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;

    const quoteResult = await pool.query(
      `
      SELECT q.*, p.name as customer_name 
      FROM sales_quotes q
      JOIN parties p ON q.customer_id = p.id
      WHERE q.id = $1 AND q.company_id = $2
      `,
      [id, companyId],
    );

    const linesResult = await pool.query(
      `
      SELECT 
        ql.id,
        ql.company_id,
        ql.sales_quote_id,
        ql.line_no,
        ql.item_id,
        ql.gl_account_id,
        ql.description,
        ql.warehouse_id,
        ql.quantity,
        ql.unit_price,
        ql.discount_percent,
        ql.tax_percent,
        ql.line_amount as total_amount, 
        ql.created_at,
        i.item_code, 
        i.name as item_name,
        a.code as account_code, 
        a.name as account_name
      FROM sales_quote_lines ql
      LEFT JOIN items i ON ql.item_id = i.id
      LEFT JOIN chart_of_accounts a ON ql.gl_account_id = a.id
      WHERE ql.sales_quote_id = $1 AND ql.company_id = $2
      ORDER BY ql.line_no ASC`,
      [id, companyId],
    );

    return NextResponse.json({
      quote: quoteResult.rows[0] || null,
      lines: linesResult.rows,
    });
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = await pool.connect();
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const body = await req.json();

    await client.query("BEGIN");

    // 1. Update Quote Header
    await client.query(
      `
      UPDATE sales_quotes
      SET customer_id = $1,
          quote_date = $2,
          valid_until = $3,
          subtotal = $4,
          total_amount = $5,
          updated_at = now()
      WHERE id = $6 AND company_id = $7
      `,
      [
        body.quote.customer_id,
        body.quote.quote_date,
        body.quote.valid_until || body.quote.expiry_date || null,
        body.quote.subtotal || 0,
        body.quote.total_amount || 0,
        id,
        companyId,
      ],
    );

    // 2. Clear out older lines entries to rewrite modified stack safely
    await client.query(
      `DELETE FROM sales_quote_lines WHERE sales_quote_id = $1 AND company_id = $2`,
      [id, companyId],
    );

    // 3. Write New Lines Matrix
    for (let i = 0; i < body.lines.length; i++) {
      const line = body.lines[i];
      const qty = Number(line.quantity ?? 0);
      const price = Number(line.unit_price ?? 0);
      const taxPercent = Number(line.tax_percent ?? 0);

      /**
       * Map frontend flexible discounts to DB single column percent:
       * 1. If it's PERCENT type, use the value directly.
       * 2. If it's a fixed AMOUNT type, calculate its actual percentage equivalent.
       */
      let computedDiscountPercent = 0;
      const discountValue = Number(line.discount_value ?? 0);

      if (discountValue > 0) {
        if (line.discount_type === "PERCENT") {
          computedDiscountPercent = discountValue;
        } else {
          const grossAmount = qty * price;
          computedDiscountPercent =
            grossAmount > 0 ? (discountValue / grossAmount) * 100 : 0;
        }
      }

      // Map frontend total_amount/line_total fields safely to DB line_amount column
      const lineAmount = Number(line.total_amount || line.line_total || 0);

      await client.query(
        `
        INSERT INTO sales_quote_lines (
          company_id, sales_quote_id, line_no, item_id, gl_account_id, description,
          warehouse_id, quantity, unit_price, discount_percent, tax_percent, line_amount
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        [
          companyId,
          id,
          i + 1,
          line.line_type === "ITEM" ? line.item_id || null : null,
          line.line_type === "GL_ACCOUNT" ? line.gl_account_id || null : null,
          line.description || null,
          line.warehouse_id || null,
          qty,
          price,
          Number(computedDiscountPercent.toFixed(2)),
          taxPercent,
          lineAmount,
        ],
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    const dbError = err as { code?: string; message?: string };
    return NextResponse.json(
      { error: dbError.message || "Update failed" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
