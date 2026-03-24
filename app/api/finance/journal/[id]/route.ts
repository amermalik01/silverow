// /api/finance/journal/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = await pool.connect();

  const { id } = await params;

  try {
    const header = await client.query(
      `SELECT * FROM journal_entries WHERE id = $1`,
      [id],
    );

    const lines = await client.query(
      `SELECT 
            l.id,
            l.account_id,
            a.code AS account_code,
            a.name AS account_name,
            l.debit,
            l.credit,
            l.description
        FROM journal_entry_lines l
        JOIN chart_of_accounts a ON a.id = l.account_id
        WHERE l.journal_id = $1`,
      [id],
    );

    return NextResponse.json({
      ...header.rows[0],
      lines: lines.rows,
    });
  } finally {
    client.release();
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = await pool.connect();
  const body = await req.json();

  const { id } = await params;

  try {
    await client.query("BEGIN");

    // ❗ Prevent editing posted journal
    const check = await client.query(
      `SELECT is_posted FROM journal_entries WHERE id = $1`,
      [id],
    );

    if (check.rows[0].is_posted) {
      throw new Error("Cannot edit posted journal");
    }

    await client.query(
      `
      UPDATE journal_entries
      SET entry_date=$1, reference=$2, description=$3
      WHERE id=$4
      `,
      [body.entry_date, body.reference, body.description, id],
    );

    // delete old lines
    await client.query(`DELETE FROM journal_entry_lines WHERE journal_id=$1`, [
      id,
    ]);

    // insert new lines
    for (const line of body.lines) {
      await client.query(
        `
        INSERT INTO journal_entry_lines
        (journal_id, account_id, debit, credit, description)
        VALUES ($1,$2,$3,$4,$5)
        `,
        [id, line.account_id, line.debit, line.credit, line.description],
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: err }, { status: 400 });
  } finally {
    client.release();
  }
}
