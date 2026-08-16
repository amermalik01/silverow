// app/api/parties/[id]/ledger/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: partyId } = await params;
    const { searchParams } = new URL(req.url);
    const partyType = searchParams.get("type") || "supplier"; // "supplier" | "customer"

    const isSupplier = partyType.toLowerCase() === "supplier";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";
    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    const query = `
      SELECT 
        id,
        document_type,
        document_id,
        document_no,
        posting_date,
        due_date,
        description,
        original_amount,
        remaining_amount,
        exchange_rate,
        is_open,
        journal_entry_id,
        created_at
      FROM ${tableName}
      WHERE company_id = $1 AND ${partyColumn} = $2
      ORDER BY posting_date DESC, created_at DESC
    `;

    const result = await pool.query(query, [companyId, partyId]);

    // Calculate totals summary
    let totalOriginal = 0;
    let totalRemaining = 0;

    const rows = result.rows.map((row) => {
      const orig = Number(row.original_amount) || 0;
      const rem = Number(row.remaining_amount) || 0;
      totalOriginal += orig;
      totalRemaining += rem;

      return {
        ...row,
        original_amount: orig,
        remaining_amount: rem,
      };
    });

    return NextResponse.json({
      entries: rows,
      summary: {
        totalOriginal,
        totalRemaining,
        openCount: rows.filter((r) => r.is_open).length,
      },
    });
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to load ledger activity" },
      { status: 500 },
    );
  }
}
