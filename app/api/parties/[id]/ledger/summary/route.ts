// app/api/parties/[id]/ledger/summary/route.ts

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
    const partyType = searchParams.get("partyType") || "supplier";
    const isSupplier = partyType.toLowerCase() === "supplier";

    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";
    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    // SQL calculation applying sign conventions directly in database engine
    const query = `
      SELECT 
        SUM(
          CASE 
            WHEN UPPER(e.document_type) LIKE '%PAYMENT%' 
              OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%REFUND%' 
            THEN -ABS(e.original_amount_fcy)
            ELSE ABS(e.original_amount_fcy)
          END
        ) AS total_original_fcy,
        SUM(
          CASE 
            WHEN UPPER(e.document_type) LIKE '%PAYMENT%' 
              OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%REFUND%' 
            THEN -ABS(e.remaining_amount_fcy)
            ELSE ABS(e.remaining_amount_fcy)
          END
        ) AS total_remaining_fcy,
        SUM(
          CASE 
            WHEN UPPER(e.document_type) LIKE '%PAYMENT%' 
              OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%REFUND%' 
            THEN -ABS(e.original_amount_lcy)
            ELSE ABS(e.original_amount_lcy)
          END
        ) AS total_original_lcy,
        SUM(
          CASE 
            WHEN UPPER(e.document_type) LIKE '%PAYMENT%' 
              OR UPPER(e.document_type) LIKE '%CREDIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%DEBIT_NOTE%' 
              OR UPPER(e.document_type) LIKE '%REFUND%' 
            THEN -ABS(e.remaining_amount_lcy)
            ELSE ABS(e.remaining_amount_lcy)
          END
        ) AS total_remaining_lcy,
        COUNT(CASE WHEN e.is_open = true AND ABS(e.remaining_amount_fcy) > 0 THEN 1 END) AS open_count
      FROM ${tableName} e
      WHERE e.company_id = $1 AND e.${partyColumn} = $2
    `;

    const result = await pool.query(query, [companyId, partyId]);
    const row = result.rows[0] || {};

    return NextResponse.json({
      summary: {
        totalOriginalFCY: Number(row.total_original_fcy) || 0,
        totalRemainingFCY: Number(row.total_remaining_fcy) || 0,
        totalOriginalLCY: Number(row.total_original_lcy) || 0,
        totalRemainingLCY: Number(row.total_remaining_lcy) || 0,
        openCount: Number(row.open_count) || 0,
      },
    });
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to fetch party summary." },
      { status: 500 },
    );
  }
}
