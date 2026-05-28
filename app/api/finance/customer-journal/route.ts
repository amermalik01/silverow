// /app/api/finance/customer-journal/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { JournalService } from "@/lib/services/journal.service";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const page = Number(searchParams.get("page") || 1);
    const limit = Number(searchParams.get("limit") || 20);

    // Filter validation matching unified status tabs logic
    let status: "posted" | "unposted" | undefined = undefined;
    if (statusParam === "posted") status = "posted";
    if (statusParam === "unposted") status = "unposted";

    // Read paginated set using source ledger discriminator "CUSTOMER_JOURNAL"
    const result = await JournalService.list(companyId, {
      status,
      source: "CUSTOMER_JOURNAL",
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Customer Journal List Exception:", err);
    return NextResponse.json(
      { error: dbError.message || "Failed to load customer journals index" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Construct the balanced payload expected by JournalService
    const balancedPayload = {
      entry_date: body.entry_date,
      source: "CUSTOMER_JOURNAL" as const, // Triggers "customer_journal" module sequences (Prefix: CJ)
      reference: body.reference,
      description: body.description,
      lines: body.lines, // Array of multi-line items safely assigned dynamically from the UI Form grid
    };

    const result = await JournalService.create(companyId, balancedPayload);
    return NextResponse.json(result);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Customer Journal Create Exception:", err);
    return NextResponse.json(
      { error: dbError.message || "Failed to create customer journal entry" },
      { status: 500 },
    );
  }
}

/* import { NextResponse } from "next/server";
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
} */
