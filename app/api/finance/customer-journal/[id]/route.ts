// /api/finance/customer-journal/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const header = await pool.query(`SELECT * FROM journal_entries WHERE id=$1`, [
    id,
  ]);

  const lines = await pool.query(
    `
    SELECT l.*, a.name as account_name
    FROM journal_entry_lines l
    JOIN chart_of_accounts a ON a.id=l.account_id
    WHERE journal_id=$1
    `,
    [id],
  );

  return NextResponse.json({
    ...header.rows[0],
    lines: lines.rows,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const body = await req.json();

  const { id } = await params;

  await pool.query(`DELETE FROM journal_entry_lines WHERE journal_id=$1`, [id]);

  // reinsert (same logic as POST)

  return NextResponse.json({ success: true });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await pool.query(
    `UPDATE journal_entries
     SET is_posted=true, posted_at=now()
     WHERE id=$1`,
    [id],
  );

  return NextResponse.json({ success: true });
}
