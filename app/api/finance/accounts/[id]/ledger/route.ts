// app/api/finance/accounts/[id]/ledger/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {

    const query = `
      SELECT 
        gle.id,
        gle.posting_date,
        gle.source_type::text AS document_type,
        COALESCE(gle.document_no, gle.entry_no) AS document_no,
        coa.code AS gl_no,
        gle.reference AS source_no,
        gle.description AS name,
        gle.source_type::text AS posting_group,
        gle.debit,
        gle.credit,
        gle.net_amount AS amount,
        gle.party_type::text AS balancing_account_type,
        gle.party_id::text AS balancing_account_no,
        CASE 
          WHEN gle.party_type = 'customer' THEN (SELECT name FROM customers WHERE id = gle.party_id)
          WHEN gle.party_type = 'supplier' THEN (SELECT name FROM suppliers WHERE id = gle.party_id)
          ELSE (SELECT name FROM chart_of_accounts WHERE id = gle.party_id)
        END AS balancing_account_name,
        COALESCE(u.name, 'System User') AS posted_by
      FROM gl_ledger_entries gle
      INNER JOIN chart_of_accounts coa ON gle.account_id = coa.id
      LEFT JOIN users u ON gle.posted_by = u.id
      WHERE gle.account_id = $1 
        AND gle.company_id = $2
      ORDER BY gle.posting_date DESC, gle.posted_at DESC;
    `;

    const result = await pool.query(query, [id, companyId]);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Ledger Drilldown Data Parsing Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ledger rows" },
      { status: 500 },
    );
  }
}
