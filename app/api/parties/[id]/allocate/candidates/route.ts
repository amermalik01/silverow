// /api/parties/[id]/allocate/candidates/route.ts 
// not in use, needs to be delete

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: partyId } = await params;
    const { searchParams } = new URL(req.url);
    const partyType = (searchParams.get("type") || "supplier").toLowerCase();
    const sourceDocType = (searchParams.get("docType") || "").toUpperCase();
    const sourceEntryId = searchParams.get("entryId");

    const isSupplier = partyType === "supplier";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";
    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    // Define allowed target document types according to business rules
    let allowedTypes: string[] = [];

    if (isSupplier) {
      if (sourceDocType.includes("PAYMENT")) {
        allowedTypes = ["PURCHASE_INVOICE", "INVOICE"];
      } else if (sourceDocType.includes("REFUND")) {
        allowedTypes = ["DEBIT_NOTE"];
      } else if (sourceDocType.includes("DEBIT_NOTE")) {
        allowedTypes = ["PURCHASE_INVOICE", "INVOICE"];
      } else if (
        sourceDocType.includes("INVOICE") ||
        sourceDocType.includes("PURCHASE_INVOICE")
      ) {
        allowedTypes = ["DEBIT_NOTE", "PAYMENT"];
      }
    } else {
      // Customer Rules
      if (sourceDocType.includes("PAYMENT")) {
        allowedTypes = ["SALES_INVOICE", "INVOICE"];
      } else if (sourceDocType.includes("REFUND")) {
        allowedTypes = ["CREDIT_NOTE"];
      } else if (sourceDocType.includes("CREDIT_NOTE")) {
        allowedTypes = ["SALES_INVOICE", "INVOICE"];
      } else if (
        sourceDocType.includes("INVOICE") ||
        sourceDocType.includes("SALES_INVOICE")
      ) {
        allowedTypes = ["CREDIT_NOTE", "PAYMENT"];
      }
    }

    if (allowedTypes.length === 0) {
      return NextResponse.json({ candidates: [] });
    }

    const query = `
      SELECT 
        e.id,
        e.document_no,
        e.document_type,
        e.posting_date,
        e.original_amount,
        e.remaining_amount,
        e.exchange_rate,
        e.is_open
      FROM ${tableName} e
      WHERE e.company_id = $1 
        AND e.${partyColumn} = $2
        AND e.is_open = true
        AND e.id != $3
        AND UPPER(e.document_type) = ANY($4)
        AND ABS(e.remaining_amount) > 0
      ORDER BY e.posting_date ASC
    `;

    const result = await pool.query(query, [
      companyId,
      partyId,
      sourceEntryId || "",
      allowedTypes,
    ]);

    return NextResponse.json({ candidates: result.rows });
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to fetch allocation candidates" },
      { status: 500 },
    );
  }
}
