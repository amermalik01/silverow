// /app/api/finance/supplier-journal/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";
import { JournalService } from "@/lib/services/journal.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Fetch master header entry details
    const headerResult = await pool.query(
      `SELECT * FROM journal_entries WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (headerResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Supplier journal voucher not found" },
        { status: 404 },
      );
    }

    // Fetch mapping split rows details
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

    return NextResponse.json({
      journal: headerResult.rows[0],
      lines: linesResult.rows,
    });
  } catch (err) {
    console.error("Get Individual Supplier Journal Error:", err);
    return NextResponse.json(
      { error: "Failed to load journal record data details" },
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
      source: "SUPPLIER_JOURNAL" as const,
      reference: body.reference,
      description: body.description,
      lines: body.lines,
    };

    await JournalService.update(companyId, id, balancedPayload);
    return NextResponse.json({ success: true });
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("Update Supplier Journal Error:", err);
    return NextResponse.json(
      {
        error:
          dbError.message || "Failed to save journal voucher modifications",
      },
      { status: 500 },
    );
  }
}
