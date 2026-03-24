// /api/finance/journal/[id]/post/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await pool.connect();

  const {id} = await params;

  try {
    await client.query("BEGIN");

    const lines = await client.query(
      `SELECT debit, credit FROM journal_entry_lines WHERE journal_id = $1`,
      [id]
    );

    const totalDebit = lines.rows.reduce((s, l) => s + Number(l.debit), 0);
    const totalCredit = lines.rows.reduce((s, l) => s + Number(l.credit), 0);

    if (totalDebit !== totalCredit) {
      throw new Error("Journal not balanced");
    }

    await client.query(
      `
      UPDATE journal_entries
      SET is_posted = true, posted_at = now()
      WHERE id = $1
      `,
      [id]
    );

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: err }, { status: 400 });
  } finally {
    client.release();
  }
}