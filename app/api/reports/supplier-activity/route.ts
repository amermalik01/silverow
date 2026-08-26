// app/api/reports/supplier-activity/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

// Helper function to handle sign inversion consistently for vendor ledger entries
function getSignedAmount(docType: string, amount: number): number {
  const normalizedType = (docType || "").toUpperCase();
  switch (normalizedType) {
    case "PURCHASE_INVOICE":
    case "INVOICE":
      return -Math.abs(amount); // Invoices increase liability (credit balance)
    case "PAYMENT":
    case "PURCHASE_DEBIT_NOTE":
    case "DEBIT_NOTE":
    case "REFUND":
      return Math.abs(amount); // Payments and Debit Notes reduce liability
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
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const reportType = searchParams.get("reportType") || "By Posting Date";
    const documentType = searchParams.get("documentType") || "All";
    const supplierIdsParam = searchParams.get("supplierIds");

    // 1. Mandatory Date Bounds Check
    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "Missing required parameters: fromDate and toDate are mandatory." },
        { status: 400 }
      );
    }

    const queryParams: unknown[] = [companyId];
    const whereConditions: string[] = ["e.company_id = $1"];

    // 2. Date Field Selection based on Report Evaluation Strategy
    let dateColumn = "e.posting_date";
    if (reportType === "By Due Date") {
      dateColumn = "e.due_date";
    } else if (reportType === "By Created Date") {
      dateColumn = "e.created_at::date";
    }

    // Apply Mandatory Date Bounds
    queryParams.push(fromDate);
    whereConditions.push(`${dateColumn} >= $${queryParams.length}`);

    queryParams.push(toDate);
    whereConditions.push(`${dateColumn} <= $${queryParams.length}`);

    // 3. Document Type Filter Strategy
    if (documentType && documentType !== "All") {
      let targetTypes: string[] = [];

      switch (documentType) {
        case "Purchase Invoices":
          targetTypes = ["PURCHASE_INVOICE", "INVOICE"];
          break;
        case "Debit Notes":
          targetTypes = ["PURCHASE_DEBIT_NOTE", "DEBIT_NOTE"];
          break;
        case "Journals":
          targetTypes = ["JOURNAL", "GENERAL_JOURNAL", "VENDOR_JOURNAL"];
          break;
        default:
          targetTypes = [documentType.toUpperCase()];
          break;
      }

      queryParams.push(targetTypes);
      whereConditions.push(`UPPER(e.document_type) = ANY($${queryParams.length}::text[])`);
    }

    // 4. Multi-select Supplier Filtering
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

    const query = `
      SELECT 
        e.id,
        e.posting_date,
        e.due_date,
        e.document_type,
        e.document_no,
        e.description,
        p.supplier_code AS vendor_no,
        p.name AS vendor_name,
        COALESCE(c.code, 'GBP') AS currency_code,
        e.exchange_rate,
        e.original_amount_fcy,
        e.remaining_amount_fcy,
        e.original_amount_lcy,
        e.remaining_amount_lcy,
        e.is_open,
        e.on_hold,
        e.on_hold_reason,
        COALESCE(SUM(la.allocated_amount_fcy), 0) AS total_allocated
      FROM vendor_ledger_entries e
      LEFT JOIN parties p ON p.id = e.vendor_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      LEFT JOIN ledger_allocations la 
        ON (la.payment_entry_id = e.id OR la.ledger_entry_id = e.id)
        AND la.is_unapplied = false
      WHERE ${whereConditions.join(" AND ")}
      GROUP BY e.id, p.supplier_code, p.name, c.code
      ORDER BY e.posting_date DESC, e.created_at DESC
    `;

    const result = await pool.query(query, queryParams);

    const rows = result.rows.map((row) => {
      const rate = Number(row.exchange_rate) || 1.0;
      const rawFCY = Number(row.original_amount_fcy) || 0;
      const rawRemFCY = Number(row.remaining_amount_fcy) || 0;
      const rawLCY = Number(row.original_amount_lcy) || 0;
      const rawRemLCY = Number(row.remaining_amount_lcy) || 0;

      return {
        ...row,
        currency_code: (row.currency_code || "GBP").toUpperCase(),
        exchange_rate: rate,
        original_amount_fcy: getSignedAmount(row.document_type, rawFCY),
        remaining_amount_fcy: getSignedAmount(row.document_type, rawRemFCY),
        amount_lcy: getSignedAmount(row.document_type, rawLCY),
        remaining_amount_lcy: getSignedAmount(row.document_type, rawRemLCY),
        total_allocated: Number(row.total_allocated) || 0,
        on_hold: Boolean(row.on_hold),
        on_hold_reason: row.on_hold_reason || "",
      };
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate Supplier Activity Report data matrix" },
      { status: 500 }
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

// Helper function to handle sign inversion consistently for vendor ledger entries
function getSignedAmount(docType: string, amount: number): number {
  const normalizedType = (docType || "").toUpperCase();
  switch (normalizedType) {
    case "PURCHASE_INVOICE":
    case "INVOICE":
      return -Math.abs(amount); // Invoices increase liability (credit balance)
    case "PAYMENT":
    case "PURCHASE_DEBIT_NOTE":
    case "DEBIT_NOTE":
    case "REFUND":
      return Math.abs(amount);  // Payments and Debit Notes reduce liability
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
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const reportType = searchParams.get("reportType") || "By Posting Date";
    const supplierIdsParam = searchParams.get("supplierIds");

    const queryParams: unknown[] = [companyId];
    const whereConditions: string[] = ["e.company_id = $1"];

    // 1. Date Field Selection based on Report Evaluation Strategy
    let dateColumn = "e.posting_date";
    if (reportType === "By Due Date") {
      dateColumn = "e.due_date";
    } else if (reportType === "By Created Date") {
      dateColumn = "e.created_at::date";
    }

    // 2. Date Filtering Bounds
    if (fromDate) {
      queryParams.push(fromDate);
      whereConditions.push(`${dateColumn} >= $${queryParams.length}`);
    }

    if (toDate) {
      queryParams.push(toDate);
      whereConditions.push(`${dateColumn} <= $${queryParams.length}`);
    }

    // 3. Multi-select Supplier Filtering
    if (supplierIdsParam) {
      const supplierIds = supplierIdsParam.split(",").map((id) => id.trim()).filter(Boolean);
      if (supplierIds.length > 0) {
        queryParams.push(supplierIds);
        whereConditions.push(`e.vendor_id = ANY($${queryParams.length}::uuid[])`);
      }
    }

    const query = `
      SELECT 
        e.id,
        e.posting_date,
        e.due_date,
        e.document_type,
        e.document_no,
        e.description,
        p.supplier_code AS vendor_no,
        p.name AS vendor_name,
        COALESCE(c.code, 'GBP') AS currency_code,
        e.exchange_rate,
        e.original_amount_fcy,
        e.remaining_amount_fcy,
        e.original_amount_lcy,
        e.remaining_amount_lcy,
        e.is_open,
        e.on_hold,
        e.on_hold_reason,
        COALESCE(SUM(la.allocated_amount_fcy), 0) AS total_allocated
      FROM vendor_ledger_entries e
      LEFT JOIN parties p ON p.id = e.vendor_id
      LEFT JOIN currencies c ON c.id = e.currency_id
      LEFT JOIN ledger_allocations la 
        ON (la.payment_entry_id = e.id OR la.ledger_entry_id = e.id)
        AND la.is_unapplied = false
      WHERE ${whereConditions.join(" AND ")}
      GROUP BY e.id, p.supplier_code, p.name, c.code
      ORDER BY e.posting_date DESC, e.created_at DESC
    `;

    const result = await pool.query(query, queryParams);

    const rows = result.rows.map((row) => {
      const rate = Number(row.exchange_rate) || 1.0;
      const rawFCY = Number(row.original_amount_fcy) || 0;
      const rawRemFCY = Number(row.remaining_amount_fcy) || 0;
      const rawLCY = Number(row.original_amount_lcy) || 0;
      const rawRemLCY = Number(row.remaining_amount_lcy) || 0;

      return {
        ...row,
        currency_code: (row.currency_code || "GBP").toUpperCase(),
        exchange_rate: rate,
        original_amount_fcy: getSignedAmount(row.document_type, rawFCY),
        remaining_amount_fcy: getSignedAmount(row.document_type, rawRemFCY),
        amount_lcy: getSignedAmount(row.document_type, rawLCY),
        remaining_amount_lcy: getSignedAmount(row.document_type, rawRemLCY),
        total_allocated: Number(row.total_allocated) || 0,
        on_hold: Boolean(row.on_hold),
        on_hold_reason: row.on_hold_reason || "",
      };
    });

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to generate Supplier Activity Report data matrix" },
      { status: 500 },
    );
  }
} */