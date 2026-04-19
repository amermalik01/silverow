// app/api/setup/general/company/currencies/set-base/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const companyId = session?.user?.company_id;

  const { currency_id } = await req.json();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // remove old base
    await client.query(
      `UPDATE company_currencies SET is_base = false WHERE company_id = $1`,
      [companyId]
    );

    // set new base
    await client.query(
      `
      UPDATE company_currencies
      SET is_base = true, exchange_rate = 1
      WHERE company_id = $1 AND currency_id = $2
      `,
      [companyId, currency_id]
    );

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (e) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  } finally {
    client.release();
  }
}