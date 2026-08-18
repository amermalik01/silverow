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
        on_hold,
        on_hold_reason,
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
      const rawOrig = Number(row.original_amount) || 0;
      const rawRem = Number(row.remaining_amount) || 0;
      const rate = Number(row.exchange_rate) || 1;

      const signedOrig = getSignedAmount(
        row.document_type,
        rawOrig,
        isSupplier,
      );
      const signedRem = getSignedAmount(row.document_type, rawRem, isSupplier);

      totalOriginal += signedOrig;
      totalRemaining += signedRem;

      return {
        ...row,
        original_amount: signedOrig,
        remaining_amount: signedRem,
        amount_lcy: signedOrig * rate,
        remaining_amount_lcy: signedRem * rate,
        on_hold: Boolean(row.on_hold),
        on_hold_reason: row.on_hold_reason || "",
      };
    });

    // const rows = result.rows.map((row) => {
    //   const orig = Number(row.original_amount) || 0;
    //   const rem = Number(row.remaining_amount) || 0;

    //   totalOriginal += orig;
    //   totalRemaining += rem;

    //   return {
    //     ...row,
    //     original_amount: orig,
    //     remaining_amount: rem,
    //   };
    // });

    return NextResponse.json({
      entries: rows,
      summary: {
        totalOriginal,
        totalRemaining,
        openCount: rows.filter((r) => r.is_open && r.remaining_amount > 0)
          .length,
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { entryId, partyType, onHold, reason } = body;

    const isSupplier = partyType.toLowerCase() === "supplier";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";

    await pool.query(
      `UPDATE ${tableName} SET on_hold = $1, on_hold_reason = $2 WHERE id = $3 AND company_id = $4`,
      [onHold, reason, entryId, companyId],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Update failed" },
      { status: 500 },
    );
  }
}

// Helper to determine document sign signifiers based on party context
function getSignedAmount(
  docType: string,
  amount: number,
  isSupplier: boolean,
): number {
  const dt = docType ? docType.toUpperCase() : "";
  const abs = Math.abs(amount);

  const isCreditType =
    dt.includes("PAYMENT") || dt.includes("CREDIT") || dt.includes("REFUND");

  if (isSupplier) {
    // Supplier: Payments / Refunds / Credit Memos reduce vendor liability (-)
    // Invoices / Debit Notes increase vendor liability (+)
    return isCreditType ? -abs : abs;
  } else {
    // Customer: Invoices / Debit Notes increase customer balance (+)
    // Payments / Refunds / Credit Memos reduce customer balance (-)
    return isCreditType ? -abs : abs;
  }
}
