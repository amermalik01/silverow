// /api/finance/journal/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const session = await getServerSession(authOptions);
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      SELECT id, entry_no, entry_date, reference, description
      FROM journal_entries
      WHERE company_id = $1
      AND is_posted = $2
      ORDER BY entry_no DESC
      `,
      [session?.user.company_id, status === "posted"]
    );

    return NextResponse.json(result.rows);
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  const { entry_date, reference, description, lines } = body;

  const client = await pool.connect();

  console.log('session?.user.company_id === ',session?.user.company_id);

  try {
    await client.query("BEGIN");

    // Generate entry_no per company
    const seq = await client.query(
      `SELECT COALESCE(MAX(entry_no),0)+1 as next 
       FROM journal_entries WHERE company_id = $1`,
      [session?.user.company_id]
    );

    const entry_no = seq.rows[0].next;

    const header = await client.query(
      `
      INSERT INTO journal_entries (
        company_id, entry_no, entry_date, reference, description
      )
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id
      `,
      [
        session?.user.company_id,
        entry_no,
        entry_date,
        reference,
        description,
      ]
    );

    const journal_id = header.rows[0].id;

    for (const line of lines) {
      await client.query(
        `
        INSERT INTO journal_entry_lines (
          company_id,journal_id, account_id, debit, credit, description
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        `,
        [
          session?.user.company_id,
          journal_id,
          line.account_id,
          line.debit || 0,
          line.credit || 0,
          line.description,
        ]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: err }, { status: 500 });
  } finally {
    client.release();
  }
}