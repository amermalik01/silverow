// app/api/purchase-invoices/[id]/posted-entries/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const client = await pool.connect();

    try {
      // Query journal entries linked via source_id = purchase_invoice_id
      const result = await client.query(
        `SELECT 
          jel.id AS entry_no,
          je.entry_date AS posting_date,
          'Purchase Invoice' AS document_type,
          je.reference AS document_number,
          coa.code AS gl_no,
          coa.name AS name,
          p.supplier_code AS source_no,
          jel.debit,
          jel.credit,
          (jel.debit - jel.credit) AS amount_lcy,
          u.name AS user_id,
          je.created_at
         FROM journal_entry_lines jel
         INNER JOIN journal_entries je ON je.id = jel.journal_id
         LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id
         LEFT JOIN parties p ON p.id = jel.party_id
         LEFT JOIN users u ON u.id = je.created_by
         WHERE (je.source_id = $1 OR jel.reference_id = $1)
           AND je.company_id = $2
         ORDER BY jel.line_no ASC`,
        [id, companyId]
      );

      return NextResponse.json({
        success: true,
        data: result.rows,
        posted_by: result.rows[0]?.user_id || "System",
        posted_at: result.rows[0]?.created_at
          ? new Date(result.rows[0].created_at).toLocaleString()
          : "",
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[GET_POSTED_ENTRIES_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ledger entries." },
      { status: 500 }
    );
  }
}