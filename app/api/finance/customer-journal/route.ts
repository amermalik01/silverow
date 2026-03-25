// /app/api/finance/customer-journal/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const result = await pool.query(
    `
    SELECT * FROM journal_entries
    WHERE source='RECEIPT'
    AND is_posted = $1
    ORDER BY entry_no DESC
    `,
    [status === "posted"]
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: Request) {
  const body = await req.json();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const header = await client.query(
      `INSERT INTO journal_entries (entry_date, source)
       VALUES ($1,'RECEIPT') RETURNING id`,
      [body.entry_date]
    );

    const id = header.rows[0].id;
    const amount = Number(body.amount);

    // customer
    await client.query(
      `INSERT INTO journal_entry_lines
       (journal_id, account_id, debit, credit, customer_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        id,
        "AR_ACCOUNT_ID",
        body.type === "PAYMENT" ? amount : 0,
        body.type === "RECEIPT" ? amount : 0,
        body.customer_id,
      ]
    );

    // offset
    await client.query(
      `INSERT INTO journal_entry_lines
       (journal_id, account_id, debit, credit)
       VALUES ($1,$2,$3,$4)`,
      [
        id,
        body.account_id,
        body.type === "RECEIPT" ? amount : 0,
        body.type === "RECEIPT" ? 0 : amount,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "fail" }, { status: 500 });
  } finally {
    client.release();
  }
}


/* export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const body = await req.json();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // create journal header
    const header = await client.query(
      `
      INSERT INTO journal_entries
      (company_id, entry_date, source)
      VALUES ($1,$2,'RECEIPT')
      RETURNING id
      `,
      [session.user.company_id, body.entry_date]
    );

    const journal_id = header.rows[0].id;

    const amount = Number(body.amount);

    // 🔥 CUSTOMER (AR)
    await client.query(
      `
      INSERT INTO journal_entry_lines
      (journal_id, account_id, debit, credit, customer_id)
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        journal_id,
        "AR_ACCOUNT_ID", // configure
        body.type === "RECEIPT" ? 0 : amount,
        body.type === "RECEIPT" ? amount : 0,
        body.customer_id,
      ]
    );

    // 🔥 OFFSET ACCOUNT
    await client.query(
      `
      INSERT INTO journal_entry_lines
      (journal_id, account_id, debit, credit)
      VALUES ($1,$2,$3,$4)
      `,
      [
        journal_id,
        body.account_id,
        body.type === "RECEIPT" ? amount : 0,
        body.type === "RECEIPT" ? 0 : amount,
      ]
    );

    await client.query("COMMIT");

    return NextResponse.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  } finally {
    client.release();
  }
} */