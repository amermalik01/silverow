// app/api/finance/item-journal/[id]/posted-entries/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const query = `
      SELECT 
        gle.transaction_id AS entry_no,
        gle.posting_date::text AS posting_date,
        CASE 
          WHEN gle.source_type::text = 'ITEM_JOURNAL' THEN 'Item Journal'
          WHEN gle.source_type::text = 'INVENTORY' THEN 'Inventory Adjustment'
          ELSE gle.source_type::text 
        END AS document_type,
        COALESCE(gle.document_no, gle.entry_no) AS document_number,
        coa.code AS gl_no,
        coa.name AS name,
        COALESCE(gle.reference, '') AS source_no, -- i.item_code, p.customer_code, p.supplier_code, 
        gle.debit AS debit_lcy,
        gle.debit_fcy,
        gle.credit AS credit_lcy,
        gle.credit_fcy,
        gle.net_amount AS net_amount_lcy,
        gle.net_amount_fcy,
        COALESCE(u.name, 'System User') AS user_id,
        gle.posted_at AS created_at
      FROM gl_ledger_entries gle
      INNER JOIN chart_of_accounts coa ON gle.account_id = coa.id
      -- LEFT JOIN items i ON gle.item_id = i.id
      -- LEFT JOIN parties p ON gle.party_id = p.id
      LEFT JOIN users u ON gle.posted_by = u.id
      WHERE (
          gle.source_journal_id = $1 
          OR gle.source_document_id = $1 
        --  OR (gle.source_type = 'ITEM_JOURNAL' AND gle.reference_id = $1)
        )
        AND gle.company_id = $2
      ORDER BY gle.transaction_id ASC;
    `;

    const result = await pool.query(query, [id, companyId]);

    const headerQuery = await pool.query(
      `SELECT j.posted_at, COALESCE(u.name, 'System User') AS posted_by 
       FROM journal_entries j
       LEFT JOIN users u ON j.created_by = u.id
       WHERE j.id = $1 AND j.company_id = $2 AND j.source = 'ITEM_JOURNAL'`,
      [id, companyId]
    );

    const header = headerQuery.rows[0];

    const posted_at = header?.posted_at
      ? new Date(header.posted_at)
          .toISOString()
          .slice(0, 10)
          .split("-")
          .reverse()
          .join("/")
      : "";

    return NextResponse.json({
      success: true,
      data: result.rows,
      posted_by: header?.posted_by || "System User",
      posted_at: posted_at,
    });
  } catch (err) {
    console.error("Fetch Posted Item Journal Entries Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch posted item journal entries." },
      { status: 500 }
    );
  }
}