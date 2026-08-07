// /app/api/finance/customer-journal/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";
import { JournalService } from "@/lib/services/journal.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Utilize JournalService.get to properly fetch joined party & G/L metadata
    const result = await JournalService.get(companyId, id);

    if (!result) {
      return NextResponse.json(
        { error: "Customer journal voucher not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Get Individual Customer Journal Exception:", dbError);
    return NextResponse.json(
      { error: "Failed to load journal records details" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const balancedPayload = {
      entry_date: body.entry_date,
      source: "CUSTOMER_JOURNAL" as const,
      reference: body.reference,
      description: body.description,
      lines: body.lines,
    };

    // 1. Persist updates to the journal entry and lines draft
    await JournalService.update(companyId, id, balancedPayload);

    // 2. If the user clicked "Post Journal" from the UI, post it to the GL ledger
    if (body.is_posted) {
      await JournalService.post(companyId, id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Update Customer Journal Exception:", err);
    return NextResponse.json(
      { error: dbError.message || "Failed to update current journal record" },
      { status: 500 },
    );
  }
}

/* 
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Fetch master ledger wrapper record details
    const headerResult = await pool.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (headerResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Journal Voucher record not found" },
        { status: 404 },
      );
    }

    // Fetch breakdown collection sequence mapping lines
    const linesResult = await pool.query(
      `
      SELECT l.*, a.code as account_code, a.name as account_name
      FROM journal_entry_lines l
      JOIN chart_of_accounts a ON a.id = l.account_id
      WHERE l.journal_id = $1
      ORDER BY l.id ASC
      `,
      [id],
    );

    // Format output mapping structure exactly as required by JournalForm type interfaces
    return NextResponse.json({
      journal: headerResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Get Individual Customer Journal Exception:", dbError);
    return NextResponse.json(
      { error: "Failed to load journal records details" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    const balancedPayload = {
      entry_date: body.entry_date,
      source: "CUSTOMER_JOURNAL" as const,
      reference: body.reference,
      description: body.description,
      lines: body.lines,
    };

    // Reuses safe sequence tracking transactions under your service class wrapper
    await JournalService.update(companyId, id, balancedPayload);
    return NextResponse.json({ success: true });
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Update Customer Journal Exception:", err);
    return NextResponse.json(
      { error: dbError.message || "Failed to update current journal record" },
      { status: 500 },
    );
  }
} */
