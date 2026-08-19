// app/api/parties/[id]/ledger/[entryId]/allocations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: partyId, entryId } = await params;
    const { searchParams } = new URL(req.url);
    const partyType = searchParams.get("type") || "supplier";
    const isSupplier = partyType.toLowerCase() === "supplier";

    const ledgerTable = isSupplier ? "vendor_ledger_entries" : "customer_ledger_entries";

    const query = `
      SELECT 
        la.id,
        la.created_at AS allocation_date,
        la.allocated_amount,
        CASE 
          WHEN la.payment_entry_id = $1 THEN target_entry.document_no
          ELSE source_entry.document_no
        END AS allocated_doc_no,
        CASE 
          WHEN la.payment_entry_id = $1 THEN target_entry.document_type
          ELSE source_entry.document_type
        END AS allocated_doc_type
      FROM ledger_allocations la
      LEFT JOIN ${ledgerTable} source_entry ON source_entry.id = la.payment_entry_id
      LEFT JOIN ${ledgerTable} target_entry ON target_entry.id = la.ledger_entry_id
      WHERE la.company_id = $2
        AND la.is_unapplied = false
        AND (la.payment_entry_id = $1 OR la.ledger_entry_id = $1)
      ORDER BY la.created_at DESC
    `;

    const result = await pool.query(query, [entryId, companyId]);

    const allocations = result.rows.map((row) => ({
      id: row.id,
      allocation_date: row.allocation_date,
      allocated_amount: Number(row.allocated_amount) || 0,
      allocated_doc_no: row.allocated_doc_no || "-",
      allocated_doc_type: row.allocated_doc_type || "-",
    }));

    return NextResponse.json({ allocations });
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to load allocations" },
      { status: 500 }
    );
  }
}