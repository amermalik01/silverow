// app/api/finance/accounts/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      SELECT
        a.id,
        a.code,
        a.name,
        a.account_type,

        COALESCE(SUM(l.debit),0) AS total_debit,
        COALESCE(SUM(l.credit),0) AS total_credit,
        COALESCE(SUM(l.debit),0) - COALESCE(SUM(l.credit),0) AS balance

      FROM chart_of_accounts a

      LEFT JOIN journal_entry_lines l
        ON l.account_id = a.id

      LEFT JOIN journal_entries j
        ON j.id = l.journal_id

      WHERE a.company_id = $1

      GROUP BY a.id

      ORDER BY a.code
      `,
      [session?.user.company_id],
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
