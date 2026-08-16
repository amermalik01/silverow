// app/api/finance/[partyType]/[partyId]/open-documents/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ partyType: string; partyId: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partyType, partyId } = await params;
    const { searchParams } = new URL(req.url);
    const docType = searchParams.get("docType") || "INVOICE"; // INVOICE | DEBIT_NOTE | CREDIT_NOTE

    const isSupplier =
      partyType.toLowerCase() === "supplier" ||
      partyType.toLowerCase() === "suppliers";
    const tableName = isSupplier
      ? "vendor_ledger_entries"
      : "customer_ledger_entries";
    const partyColumn = isSupplier ? "vendor_id" : "customer_id";

    // Map query docType to stored database document_type values
    let targetDocTypes: string[] = [];
    if (isSupplier) {
      targetDocTypes =
        docType === "REFUND" || docType === "DEBIT_NOTE"
          ? ["DEBIT_NOTE", "PURCHASE_DEBIT_NOTE"]
          : ["PURCHASE_INVOICE", "INVOICE"];
    } else {
      targetDocTypes =
        docType === "REFUND" || docType === "CREDIT_NOTE"
          ? ["CREDIT_NOTE", "SALES_CREDIT_NOTE"]
          : ["SALES_INVOICE", "INVOICE"];
    }

    const query = `
      SELECT 
        id,
        document_no,
        document_type,
        posting_date,
        due_date,
        original_amount,
        remaining_amount,
        currency_id
      FROM ${tableName}
      WHERE company_id = $1 
        AND ${partyColumn} = $2 
        AND is_open = true 
        AND remaining_amount > 0
        AND document_type = ANY($3::text[])
      ORDER BY posting_date ASC, created_at ASC
      `;

    // console.log("query === ", query);
    // console.log("partyId === ", partyId);
    // console.log("targetDocTypes === ", targetDocTypes);

    const result = await pool.query(query, [
      companyId,
      partyId,
      targetDocTypes,
    ]);

    return NextResponse.json(result.rows);
  } catch (err) {
    const dbError = err as { message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to load open documents" },
      { status: 500 },
    );
  }
}
