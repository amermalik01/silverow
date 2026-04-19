// app/api/setup/general/company/currencies/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { companyCurrencySchema } from "@/lib/validations/currency.schema";

export async function GET() {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.company_id;

  const result = await pool.query(
    `
    SELECT c.id, c.code, c.name, c.symbol, cc.exchange_rate, cc.is_base
    FROM currencies c
    JOIN company_currencies cc ON cc.currency_id = c.id
    WHERE cc.company_id = $1
    AND cc.status = 1
    ORDER BY c.name
    `,
    [companyId],
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.company_id;

  const body = await req.json();

  const parsed = companyCurrencySchema.safeParse(body);

  if (!parsed.success) {
    const formatted = parsed.error.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));

    return NextResponse.json({ error: formatted }, { status: 400 });
  }

  const { currency_id, exchange_rate, is_base } = parsed.data;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    if (is_base) {
      await client.query(
        `UPDATE company_currencies SET is_base = false WHERE company_id = $1`,
        [companyId],
      );
    }

    await client.query(
      `
      INSERT INTO company_currencies (company_id, currency_id, exchange_rate, is_base)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (company_id, currency_id)
      DO UPDATE SET exchange_rate = $3, is_base = $4
      `,
      [companyId, currency_id, exchange_rate, is_base],
    );

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (e) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "DB error", e }, { status: 500 });
  } finally {
    client.release();
  }
}
