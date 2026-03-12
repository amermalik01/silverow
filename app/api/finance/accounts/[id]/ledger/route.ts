// app/api/finance/accounts/[id]/ledger/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  const session = await getServerSession(authOptions);

  const client = await pool.connect();
  const { id } = await params;

  try {

    const result = await client.query(
      `
      SELECT
        j.entry_date,
        j.reference,
        j.description,
        l.debit,
        l.credit

      FROM journal_entry_lines l

      JOIN journal_entries j
        ON j.id = l.journal_id

      WHERE l.account_id = $1
      AND j.company_id = $2

      ORDER BY j.entry_date DESC
      `,
      [id, session?.user.company_id]
    );

    return NextResponse.json(result.rows);

  } finally {
    client.release();
  }
}