// /app/api/finance/general-journal/[id]/posted-entries/route.ts

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

    const { id } = await params;

    const query = `
      SELECT 
        gle.entry_no,
        gle.posting_date,
        gle.source_type AS document_type,
        COALESCE(gle.document_no, gle.entry_no) AS document_number,
        coa.code AS gl_no,
        coa.name AS name,
        gle.reference AS source_no,
        gle.debit,
        gle.credit,
        (gle.debit - gle.credit) AS amount_lcy,
        COALESCE(u.name, 'System User') AS user_id,
        gle.posted_at AS created_at
      FROM gl_ledger_entries gle
      INNER JOIN chart_of_accounts coa ON gle.account_id = coa.id
      LEFT JOIN users u ON gle.posted_by = u.id
      WHERE gle.source_journal_id = $1 
        AND gle.company_id = $2
      ORDER BY gle.posting_date DESC;
    `;

    const result = await pool.query(query, [id, companyId]);

    // Fetch poster information header
    const headerQuery = await pool.query(
      `SELECT j.posted_at, COALESCE(u.name, 'System User') AS posted_by 
       FROM journal_entries j
       LEFT JOIN users u ON j.created_by = u.id
       WHERE j.id = $1 AND j.company_id = $2`,
      [id, companyId],
    );

    const header = headerQuery.rows[0];

    return NextResponse.json({
      success: true,
      data: result.rows,
      posted_by: header?.posted_by || "System User",
      posted_at: header?.posted_at
        ? new Date(header.posted_at).toLocaleDateString("en-GB")
        : "",
    });
  } catch (err) {
    console.error("Fetch Posted Journal Entries Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch posted entries." },
      { status: 500 },
    );
  }
}
