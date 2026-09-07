// app/api/finance/accounts/[id]/ledger/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const isExport = searchParams.get("export") === "csv";
    const search = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "10", 10)));
    const offset = (page - 1) * limit;

    // Column Filters from UI Inputs
    const filterPostingDate = searchParams.get("posting_date")?.trim();
    const filterDocType = searchParams.get("document_type")?.trim();
    const filterDocNo = searchParams.get("document_no")?.trim();
    const filterSourceNo = searchParams.get("source_no")?.trim();
    const filterName = searchParams.get("name")?.trim();
    const filterCurrency = searchParams.get("currency_code")?.trim();
    const filterBalancingType = searchParams.get("balancing_account_type")?.trim();
    const filterBalancingNo = searchParams.get("balancing_account_no")?.trim();
    const filterBalancingName = searchParams.get("balancing_account_name")?.trim();
    const filterEntryNo = searchParams.get("entry_no")?.trim();
    const filterPostedBy = searchParams.get("posted_by")?.trim();

    const values: (string | number)[] = [id, companyId];
    let whereClause = `
      WHERE gle.account_id = $1 
        AND gle.company_id = $2
    `;

    // Global Search
    if (search) {
      values.push(`%${search}%`);
      const idx = values.length;
      whereClause += ` AND (
        gle.document_no ILIKE $${idx} OR 
        gle.entry_no ILIKE $${idx} OR 
        gle.reference ILIKE $${idx} OR 
        gle.description ILIKE $${idx} OR
        gle.source_document_no ILIKE $${idx}
      )`;
    }

    // Column Filters
    if (filterPostingDate) {
      values.push(`%${filterPostingDate}%`);
      whereClause += ` AND gle.posting_date::text ILIKE $${values.length}`;
    }
    if (filterDocType) {
      values.push(`%${filterDocType}%`);
      whereClause += ` AND gle.source_type::text ILIKE $${values.length}`;
    }
    if (filterDocNo) {
      values.push(`%${filterDocNo}%`);
      whereClause += ` AND (gle.document_no ILIKE $${values.length} OR gle.entry_no ILIKE $${values.length})`;
    }
    if (filterSourceNo) {
      values.push(`%${filterSourceNo}%`);
      whereClause += ` AND gle.reference ILIKE $${values.length}`;
    }
    if (filterName) {
      values.push(`%${filterName}%`);
      whereClause += ` AND gle.description ILIKE $${values.length}`;
    }
    if (filterCurrency) {
      values.push(`%${filterCurrency}%`);
      whereClause += ` AND curr.code ILIKE $${values.length}`;
    }
    if (filterBalancingType) {
      values.push(`%${filterBalancingType}%`);
      whereClause += ` AND gle.party_type::text ILIKE $${values.length}`;
    }
    if (filterBalancingNo) {
      values.push(`%${filterBalancingNo}%`);
      whereClause += ` AND gle.party_id::text ILIKE $${values.length}`;
    }
    if (filterEntryNo) {
      values.push(`%${filterEntryNo}%`);
      whereClause += ` AND gle.transaction_id::text ILIKE $${values.length}`;
    }
    if (filterPostedBy) {
      values.push(`%${filterPostedBy}%`);
      whereClause += ` AND COALESCE(u.name, 'System User') ILIKE $${values.length}`;
    }

    const selectFields = `
      gle.id,
      gle.posting_date,
      gle.source_type::text AS document_type,
      COALESCE(gle.document_no, gle.entry_no) AS document_no,
      coa.code AS gl_no,
      gle.reference AS source_no,
      gle.description AS name,
      gle.source_type::text AS posting_group,
      COALESCE(curr.code, 'GBP') AS currency_code,
      gle.exchange_rate,
      gle.debit AS debit_lcy,
      gle.credit AS credit_lcy,
      gle.net_amount AS amount_lcy,
      gle.debit_fcy,
      gle.credit_fcy,
      gle.net_amount_fcy AS amount_fcy,
      gle.party_type::text AS balancing_account_type,
      CASE 
        WHEN gle.party_type = 'customer' THEN (SELECT customer_code FROM parties WHERE id = gle.party_id)
        WHEN gle.party_type = 'supplier' THEN (SELECT supplier_code FROM parties WHERE id = gle.party_id)
        ELSE (SELECT code FROM chart_of_accounts WHERE id = gle.party_id)
      END AS balancing_account_no,
      CASE 
        WHEN gle.party_type = 'customer' THEN (SELECT name FROM parties WHERE id = gle.party_id)
        WHEN gle.party_type = 'supplier' THEN (SELECT name FROM parties WHERE id = gle.party_id)
        ELSE (SELECT name FROM chart_of_accounts WHERE id = gle.party_id)
      END AS balancing_account_name,
      gle.transaction_id::text AS entry_no,
      COALESCE(u.name, 'System User') AS posted_by
    `;

    // Handle CSV Export Call
    if (isExport) {
      const exportQuery = `
        SELECT ${selectFields}
        FROM gl_ledger_entries gle
        INNER JOIN chart_of_accounts coa ON gle.account_id = coa.id
        LEFT JOIN currencies curr ON gle.currency_id = curr.id
        LEFT JOIN users u ON gle.posted_by = u.id
        ${whereClause}
        ${filterBalancingName ? `HAVING CASE WHEN gle.party_type = 'customer' THEN (SELECT name FROM parties WHERE id = gle.party_id) WHEN gle.party_type = 'supplier' THEN (SELECT name FROM parties WHERE id = gle.party_id) ELSE (SELECT name FROM chart_of_accounts WHERE id = gle.party_id) END ILIKE '%${filterBalancingName}%'` : ""}
        ORDER BY gle.posting_date DESC, gle.posted_at DESC;
      `;
      const exportResult = await pool.query(exportQuery, values);
      return NextResponse.json({ data: exportResult.rows });
    }

    // Standard Paginated Query with Window Count
    values.push(limit, offset);
    const limitIdx = values.length - 1;
    const offsetIdx = values.length;

    const query = `
      WITH base_ledger AS (
        SELECT 
          ${selectFields}
        FROM gl_ledger_entries gle
        INNER JOIN chart_of_accounts coa ON gle.account_id = coa.id
        LEFT JOIN currencies curr ON gle.currency_id = curr.id
        LEFT JOIN users u ON gle.posted_by = u.id
        ${whereClause}
      )
      SELECT *, COUNT(*) OVER() AS total_count
      FROM base_ledger
      ${filterBalancingName ? `WHERE balancing_account_name ILIKE '%${filterBalancingName}%'` : ""}
      ORDER BY posting_date DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx};
    `;

    const result = await pool.query(query, values);
    const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    console.error("Ledger Drilldown API Error:", error);
    return NextResponse.json({ error: "Failed to fetch ledger entries" }, { status: 500 });
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
} */
