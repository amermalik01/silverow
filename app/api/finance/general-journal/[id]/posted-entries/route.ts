// /app/api/finance/general-journal/[id]/posted-entries/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function POST(
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
        gle.transaction_id AS entry_no,
        gle.posting_date,
        CASE 
          WHEN gle.source_type::text = 'FX_VARIANCE' THEN 'Realized FX Variance'
          WHEN gle.source_type::text = 'GENERAL_JOURNAL' THEN 'General Journal'
          ELSE gle.source_type::text 
        END AS document_type,
        COALESCE(gle.document_no, gle.entry_no) AS document_number,
        coa.code AS gl_no,
        coa.name AS name,
        COALESCE(p.customer_code, p.supplier_code,  gle.reference, '') AS source_no,
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
      LEFT JOIN parties p ON gle.party_id = p.id
      LEFT JOIN users u ON gle.posted_by = u.id
      WHERE (gle.source_journal_id = $1 OR gle.source_document_id = $1)
        AND gle.company_id = $2
      ORDER BY gle.posting_date ASC, gle.posted_at ASC;
    `;

    // console.log('query ==== ',query);
    // console.log('id == ',id);

    const result = await pool.query(query, [id, companyId]);

    const headerQuery = await pool.query(
      `SELECT j.posted_at, COALESCE(u.name, 'System User') AS posted_by 
       FROM journal_entries j
       LEFT JOIN users u ON j.created_by = u.id
       WHERE j.id = $1 AND j.company_id = $2`,
      [id, companyId],
    );

    const header = headerQuery.rows[0];

    // const posted_at = latestEntry?.created_at ? new Date(latestEntry.created_at).toLocaleDateString("en-GB") : "";
    const posted_at = header?.posted_at
      ? new Date(header?.posted_at)
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
      posted_at: posted_at
      // posted_at: header?.posted_at
      //   ? new Date(header.posted_at).toLocaleDateString("en-GB")
      //   : "",
    });
  } catch (err) {
    console.error("Fetch Posted Journal Entries Error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch posted entries." },
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
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
        gle.transaction_id AS entry_no,
        gle.posting_date,
        CASE 
          WHEN gle.source_type::text = 'FX_VARIANCE' THEN 'Realized FX Variance'
          ELSE gle.source_type::text 
        END AS document_type,
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
      WHERE (gle.source_journal_id = $1 OR gle.reference = CONCAT('ALLOC_FX_', $1))
        AND gle.company_id = $2
      ORDER BY gle.posting_date DESC, gle.posted_at DESC;
    `;

    const result = await pool.query(query, [id, companyId]);

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
} */

/* export async function GET(
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
        gle.transaction_id AS entry_no,
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

    console.log('query ==== ',query);
    console.log('id ==== ',id);

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
} */
