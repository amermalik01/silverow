// app/api/setup/posting/accounting-periods/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const result = await pool.query(
      `SELECT id, start_date, end_date, is_closed 
       FROM accounting_periods 
       WHERE company_id = $1 
       ORDER BY start_date DESC`,
      [session.user.company_id],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Accounting Periods GET Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { start_date, end_date } = await req.json();

    if (!start_date || !end_date) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 },
      );
    }

    // Validation: Check for overlapping configurations to maintain ledger integrity
    const overlapCheck = await pool.query(
      `SELECT id FROM accounting_periods
       WHERE company_id = $1 AND (
         (start_date <= $2 AND end_date >= $2) OR
         (start_date <= $3 AND end_date >= $3) OR
         ($2 <= start_date AND $3 >= end_date)
       ) LIMIT 1`,
      [session.user.company_id, start_date, end_date],
    );

    if (overlapCheck.rowCount && overlapCheck.rowCount > 0) {
      return NextResponse.json(
        { error: "Date targets overlap with an existing accounting window." },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `INSERT INTO accounting_periods (company_id, start_date, end_date, is_closed)
       VALUES ($1, $2, $3, false) RETURNING id`,
      [session.user.company_id, start_date, end_date],
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Accounting Periods POST Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
