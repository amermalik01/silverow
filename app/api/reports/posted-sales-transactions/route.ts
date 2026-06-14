// app/api/reports/posted-sales-transactions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  // Extract Parameter Filters
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate") || "2026-06-14";
  const documentType = searchParams.get("documentType") || "both"; // 'sales invoices', 'posted credit notes', 'both'
  const finance = searchParams.get("finance") || "Both"; // 'Include', 'Exclude', 'Both'
  const insurance = searchParams.get("insurance") || "Both"; // 'Include', 'Exclude', 'Both'
  const salespersons = searchParams.get("salespersons")
    ? searchParams.get("salespersons")?.split(",")
    : [];

  // Dynamic values tracking array
  const values: unknown[] = [companyId];

  // Build Shared Filters for SQL Queries dynamically
  let dateFilterStr = "";
  if (fromDate && toDate) {
    values.push(fromDate, toDate);
    dateFilterStr = `AND date_field BETWEEN $${values.length - 1} AND $${values.length}`;
  }

  let salespersonFilterStr = "";
  if (salespersons && salespersons.length > 0) {
    values.push(salespersons);
    salespersonFilterStr = `AND creator_field = ANY($${values.length})`;
  }

  // Channel helper logic processing (Fallbacks to false if columns do not exist on schema)
  const buildChannelFilter = (option: string, columnExpression: string) => {
    if (option === "Include") return `AND ${columnExpression} = true`;
    if (option === "Exclude") return `AND ${columnExpression} = false`;
    return "";
  };

  const invoiceChannelFilters = `
    ${buildChannelFilter(finance, "COALESCE((si.remarks ILIKE '%finance%'), false)")}
    ${buildChannelFilter(insurance, "COALESCE((si.remarks ILIKE '%insurance%'), false)")}
  `;

  const creditNoteChannelFilters = `
    ${buildChannelFilter(finance, "COALESCE((cr.notes ILIKE '%finance%'), false)")}
    ${buildChannelFilter(insurance, "COALESCE((cr.notes ILIKE '%insurance%'), false)")}
  `;

  // Define Subqueries for both tables
  const invoiceQuery = `
    SELECT 
      si.id,
      si.invoice_date AS posting_date,
      'Invoice'::text AS document_type,
      si.invoice_no AS document_no,
      -- cust.customer_no,
      cust.name AS customer_name,
      COALESCE(emp.display_name, emp.first_name || ' ' || emp.last_name) AS salesperson_name,
      COALESCE((si.remarks ILIKE '%finance%'), false) AS finance_channel,
      COALESCE((si.remarks ILIKE '%insurance%'), false) AS insurance_channel,
      (si.subtotal * si.exchange_rate) AS amount_excluding_vat,
      (si.vat_amount * si.exchange_rate) AS vat_amount,
      (si.total_amount * si.exchange_rate) AS amount_including_vat
    FROM public.sales_invoices si
    LEFT JOIN public.customers cust ON si.customer_id = cust.id
    LEFT JOIN public.employees emp ON si.created_by = emp.id
    WHERE si.company_id = $1 AND si.is_posted = true
    ${dateFilterStr.replace("date_field", "si.invoice_date")}
    ${salespersonFilterStr.replace("creator_field", "si.created_by")}
    ${invoiceChannelFilters}
  `;

  const creditNoteQuery = `
    SELECT 
      cr.id,
      cr.posting_date AS posting_date,
      'Credit Note'::text AS document_type,
      cr.credit_note_no AS document_no,
      -- cust.customer_no,
      cust.name AS customer_name,
      COALESCE(emp.display_name, emp.first_name || ' ' || emp.last_name) AS salesperson_name,
      COALESCE((cr.notes ILIKE '%finance%'), false) AS finance_channel,
      COALESCE((cr.notes ILIKE '%insurance%'), false) AS insurance_channel,
      (cr.subtotal * cr.exchange_rate) AS amount_excluding_vat,
      (cr.tax_amount * cr.exchange_rate) AS vat_amount,
      (cr.total_amount * cr.exchange_rate) AS amount_including_vat
    FROM public.posted_sales_returns cr
    LEFT JOIN public.customers cust ON cr.customer_id = cust.id
    LEFT JOIN public.employees emp ON cr.posted_by = emp.id
    WHERE cr.company_id = $1
    ${dateFilterStr.replace("date_field", "cr.posting_date")}
    ${salespersonFilterStr.replace("creator_field", "cr.posted_by")}
    ${creditNoteChannelFilters}
  `;

  // Combine queries using UNION ALL depending on Document Type Filter parameter
  let finalCombinedQuery = "";
  if (documentType === "sales invoices") {
    finalCombinedQuery = `${invoiceQuery} ORDER BY posting_date DESC, document_no DESC`;
  } else if (documentType === "posted credit notes") {
    finalCombinedQuery = `${creditNoteQuery} ORDER BY posting_date DESC, document_no DESC`;
  } else {
    finalCombinedQuery = `
      (${invoiceQuery})
      UNION ALL
      (${creditNoteQuery})
      ORDER BY posting_date DESC, document_no DESC
    `;
  }

  try {
    const result = await pool.query(finalCombinedQuery, values);

    // Explicit format conversion map over numbers for safe client-side operations
    const formattedData = result.rows.map((row) => ({
      ...row,
      amount_excluding_vat: Number(row.amount_excluding_vat || 0),
      vat_amount: Number(row.vat_amount || 0),
      amount_including_vat: Number(row.amount_including_vat || 0),
    }));

    return NextResponse.json({ data: formattedData });
  } catch (err) {
    console.error("Database lookup matrix failure context: ", err);
    return NextResponse.json(
      { error: "Failed to load historical posted financial ledger datasets." },
      { status: 500 },
    );
  }
}
