// app/api/reports/supplier-statement/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

interface StatementEntry {
  id: string;
  posting_date: string;
  due_date: string | null;
  document_type: string;
  document_no: string;
  external_doc_no: string;
  currency_code: string;
  original_amount: number;
  settled_amount: number;
  outstanding_amount: number;
  running_balance: number;
}

interface AgeingSummary {
  currency_code: string;
  b0_30: number;
  b31_60: number;
  b61_90: number;
  b91_120: number;
  b_over_120: number;
  total: number;
}

interface CompanyBankInfo {
  bank_name: string;
  account_name: string;
  sort_code: string;
  account_no: string;
  vat_reg_no: string;
  payment_terms: string;
}

interface SupplierStatementGroup {
  vendor_id: string;
  vendor_no: string;
  vendor_name: string;
  country: string;
  currency_code: string;
  company_bank_info: CompanyBankInfo;
  entries: StatementEntry[];
  total_outstanding: number;
  ageing_summary: AgeingSummary[];
}

function getSignedAmount(docType: string, amount: number): number {
  const normalizedType = (docType || "").toUpperCase();
  switch (normalizedType) {
    case "PURCHASE_INVOICE":
    case "INVOICE":
      return -Math.abs(amount); // Increases AP liability (credit balance)
    case "PAYMENT":
    case "PURCHASE_DEBIT_NOTE":
    case "DEBIT_NOTE":
    case "REFUND":
      return Math.abs(amount); // Decreases AP liability
    default:
      return amount;
  }
}

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const asOfDate = searchParams.get("asOfDate");
    const supplierIdsParam = searchParams.get("supplierIds");

    if (!asOfDate) {
      return NextResponse.json(
        { error: "'Date as at' parameter is mandatory." },
        { status: 400 }
      );
    }

    const queryParams: unknown[] = [companyId, asOfDate];
    const whereConditions: string[] = [
      "e.company_id = $1",
      "e.posting_date <= $2",
      "e.remaining_amount_fcy <> 0", // Only open/outstanding balances
    ];

    if (supplierIdsParam) {
      const supplierIds = supplierIdsParam
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      if (supplierIds.length > 0) {
        queryParams.push(supplierIds);
        whereConditions.push(`e.vendor_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    // 1. Fetch Company Level Metadata & Default Bank Account
    const companyRes = await pool.query(
      `SELECT name, vat_reg_no FROM companies WHERE id = $1`,
      [companyId]
    );
    const companyData = companyRes.rows[0] || {};

    const defaultBankRes = await pool.query(
      `SELECT bank_name, account_name, sort_code, account_no 
       FROM bank_accounts 
       WHERE company_id = $1 
       ORDER BY created_at ASC LIMIT 1`,
      [companyId]
    );
    const defaultBank = defaultBankRes.rows[0] || {};

    // 2. Fetch Supplier Statement Ledger Entries & Match Assigned Payable Bank
    const statementQuery = `
      SELECT 
        e.id,
        e.posting_date,
        e.due_date,
        e.document_type,
        e.document_no,
        '' as external_document_no,
        p.id AS vendor_id,
        p.supplier_code AS vendor_no,
        p.name AS vendor_name,
        p.payment_terms AS vendor_payment_terms,
        p.vat_reg_no AS vendor_vat_no,
        '' AS country,
        COALESCE(c.code, 'GBP') AS currency_code,
        e.original_amount_fcy,
        e.remaining_amount_fcy,
        (e.original_amount_fcy - e.remaining_amount_fcy) AS settled_amount_fcy,
        ba.bank_name AS assigned_bank_name,
        ba.account_name AS assigned_account_name,
        ba.sort_code AS assigned_sort_code,
        ba.account_no AS assigned_account_no
      FROM vendor_ledger_entries e
      LEFT JOIN parties p ON p.id = e.vendor_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      LEFT JOIN bank_accounts ba 
        ON ba.company_id = e.company_id 
       AND (
         ba.id::text = p.payable_bank 
         OR ba.account_name = p.payable_bank 
         OR ba.bank_name = p.payable_bank
       )
      WHERE ${whereConditions.join(" AND ")}
      ORDER BY p.name ASC, e.posting_date ASC
    `;

    const result = await pool.query(statementQuery, queryParams);
    const groupedStatements: Record<string, SupplierStatementGroup> = {};

    result.rows.forEach((row) => {
      const vendorKey = row.vendor_id;
      if (!groupedStatements[vendorKey]) {
        // Resolve Bank Details (Prefer Party's assigned payable_bank, fallback to Company Default)
        const bankName = row.assigned_bank_name || defaultBank.bank_name || "Lloyds Bank";
        const accountName = row.assigned_account_name || defaultBank.account_name || companyData.name || "Hygge Bikes Ltd";
        const sortCode = row.assigned_sort_code || defaultBank.sort_code || "30-96-96";
        const accountNo = row.assigned_account_no || defaultBank.account_no || "80077860";

        groupedStatements[vendorKey] = {
          vendor_id: row.vendor_id,
          vendor_no: row.vendor_no,
          vendor_name: row.vendor_name,
          country: row.country,
          currency_code: (row.currency_code || "GBP").toUpperCase(),
          company_bank_info: {
            bank_name: bankName,
            account_name: accountName,
            sort_code: sortCode,
            account_no: accountNo,
            vat_reg_no: companyData.vat_reg_no || row.vendor_vat_no || "",
            payment_terms: row.vendor_payment_terms || "",
          },
          entries: [],
          total_outstanding: 0,
          ageing_summary: [],
        };
      }

      const rawOrig = Number(row.original_amount_fcy) || 0;
      const rawRem = Number(row.remaining_amount_fcy) || 0;
      const rawSettled = Number(row.settled_amount_fcy) || 0;

      const signedOrig = getSignedAmount(row.document_type, rawOrig);
      const signedRem = getSignedAmount(row.document_type, rawRem);
      const signedSettled = rawSettled !== 0 ? Math.abs(rawSettled) : 0;

      groupedStatements[vendorKey].total_outstanding += signedRem;

      groupedStatements[vendorKey].entries.push({
        id: row.id,
        posting_date: row.posting_date,
        due_date: row.due_date,
        document_type: row.document_type,
        document_no: row.document_no,
        external_doc_no: row.external_document_no || "-",
        currency_code: (row.currency_code || "GBP").toUpperCase(),
        original_amount: Math.abs(signedOrig),
        settled_amount: signedSettled,
        outstanding_amount: signedRem,
        running_balance: groupedStatements[vendorKey].total_outstanding,
      });
    });

    // 3. Compute Ageing Summary Matrix per Supplier
    const ageingQuery = `
      SELECT 
        p.id AS vendor_id,
        COALESCE(c.code, 'GBP') AS currency_code,
        SUM(e.remaining_amount_fcy) AS total,
        SUM(CASE WHEN ($2::date - e.posting_date) BETWEEN 0 AND 30 THEN e.remaining_amount_fcy ELSE 0 END) AS b0_30,
        SUM(CASE WHEN ($2::date - e.posting_date) BETWEEN 31 AND 60 THEN e.remaining_amount_fcy ELSE 0 END) AS b31_60,
        SUM(CASE WHEN ($2::date - e.posting_date) BETWEEN 61 AND 90 THEN e.remaining_amount_fcy ELSE 0 END) AS b61_90,
        SUM(CASE WHEN ($2::date - e.posting_date) BETWEEN 91 AND 120 THEN e.remaining_amount_fcy ELSE 0 END) AS b91_120,
        SUM(CASE WHEN ($2::date - e.posting_date) > 120 THEN e.remaining_amount_fcy ELSE 0 END) AS b_over_120
      FROM vendor_ledger_entries e
      LEFT JOIN parties p ON p.id = e.vendor_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      WHERE ${whereConditions.join(" AND ")}
      GROUP BY p.id, c.code
    `;

    const ageingResult = await pool.query(ageingQuery, queryParams);

    ageingResult.rows.forEach((ar) => {
      const vendorKey = ar.vendor_id;
      if (groupedStatements[vendorKey]) {
        groupedStatements[vendorKey].ageing_summary.push({
          currency_code: (ar.currency_code || "GBP").toUpperCase(),
          b0_30: Number(ar.b0_30),
          b31_60: Number(ar.b31_60),
          b61_90: Number(ar.b61_90),
          b91_120: Number(ar.b91_120),
          b_over_120: Number(ar.b_over_120),
          total: Number(ar.total),
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: Object.values(groupedStatements),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate Supplier Statement Report" },
      { status: 500 }
    );
  }
}