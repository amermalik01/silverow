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
        gle.entry_no AS document_no,
        coa.code AS gl_no,
        gle.reference AS source_no,
        gle.description AS name,
        gle.debit,
        gle.credit,
        gle.net_amount AS amount,
        gle.transaction_id,
        gle.vat_transaction_id,
        gle.party_type AS balancing_account_type, -- Maps subledger type context if relevant
        gle.party_id::text AS balancing_account_no,
        'System User' AS posted_by
      FROM gl_ledger_entries gle
      INNER JOIN chart_of_accounts coa ON gle.account_id = coa.id
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

/* import { NextResponse } from "next/server";
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

  const client = await pool.connect();
  const { id } = await params;

  try {
    const query = `
      SELECT 
        jel.id,
        je.entry_date AS posting_date,
        je.source::text AS document_type,
        je.entry_no AS document_no,
        coa.code AS gl_no,
        je.reference AS source_no,
        jel.description AS name,
        je.journal_type AS posting_group,
        jel.debit,
        jel.credit,
        (jel.debit - jel.credit) AS amount,
        jel.reference_type AS balancing_account_type,
        jel.reference_id::text AS balancing_account_no,
        '' AS balancing_account_name, -- Populate if needed via sub-joins
        'System User' AS posted_by -- Replace with internal application auth contexts if tracked
      FROM journal_entry_lines jel
      INNER JOIN journal_entries je ON jel.journal_id = je.id
      INNER JOIN chart_of_accounts coa ON jel.account_id = coa.id
      WHERE jel.account_id = $1 AND jel.company_id = $2 AND je.is_posted = true
      ORDER BY je.entry_date DESC, jel.created_at DESC;
    `;

    const result = await pool.query(query, [id, companyId]);
    return NextResponse.json(result.rows);

    // const result = await client.query(
    //   `
    //   SELECT
    //     j.entry_date,
    //     j.reference,
    //     j.description,
    //     l.debit,
    //     l.credit

    //   FROM journal_entry_lines l

    //   JOIN journal_entries j
    //     ON j.id = l.journal_id

    //   WHERE l.account_id = $1
    //   AND j.company_id = $2
    //   AND j.is_posted = true

    //   ORDER BY j.entry_date DESC
    //   `,
    //   [id, companyId],
    // ); 

    // return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Ledger Drilldown Data Parsing Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ledger rows" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
} */
