// app/api/sales/sales-invoices/[id]/posted-entries/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id: invoiceId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const client = await pool.connect();

    try {
      // 1. Trace related documents (Sales Order & Sales Shipments/Dispatches)
      const docQuery = await client.query(
        `SELECT so.id AS sales_order_id
         FROM sales_orders so
         WHERE (so.id = $1 OR so.sales_quote_id = $1) AND so.company_id = $2`,
        [invoiceId, companyId],
      );

      const salesOrderId = docQuery.rows[0]?.sales_order_id || invoiceId;
      const targetSourceIds: string[] = [invoiceId];

      if (salesOrderId && salesOrderId !== invoiceId) {
        targetSourceIds.push(salesOrderId);
      }

      // Fetch related sales shipments/dispatches if applicable
      const shipmentsRes = await client.query(
        `SELECT id FROM stock_dispatches 
         WHERE sales_order_id = $1 AND company_id = $2`,
        [salesOrderId, companyId],
      ).catch(() => ({ rows: [] })); // Fallback if sales_shipments table is omitted

      shipmentsRes.rows.forEach((r) => targetSourceIds.push(r.id));

      // 2. Fetch all postings directly from gl_ledger_entries
      const query = `
        SELECT 
          gle.transaction_id AS entry_no,
          gle.posting_date::text AS posting_date,
          CASE 
            WHEN gle.source_type::text = 'SALES_SHIPMENT' THEN 'Sales Shipment'
            WHEN gle.source_type::text = 'SALES_INVOICE' THEN 'Sales Invoice'
            WHEN gle.source_type::text = 'SALES_ORDER' THEN 'Sales Order'
            WHEN gle.source_type::text = 'FX_VARIANCE' THEN 'Realized FX Variance'
            ELSE gle.source_type::text
          END AS document_type,
          COALESCE(gle.document_no, gle.source_document_no, gle.entry_no) AS document_number,
          coa.code AS gl_no,
          coa.name AS name,
          COALESCE(p.customer_code, p.supplier_code, gle.reference, '') AS source_no,
          gle.debit AS debit_lcy,
          gle.debit_fcy,
          gle.credit AS credit_lcy,
          gle.credit_fcy,
          gle.net_amount AS net_amount_lcy,
          gle.net_amount_fcy,
          COALESCE(u.name, 'System') AS user_id,
          gle.posted_at AS created_at
        FROM gl_ledger_entries gle
        INNER JOIN chart_of_accounts coa ON coa.id = gle.account_id
        LEFT JOIN parties p ON p.id = gle.party_id
        LEFT JOIN users u ON u.id = gle.posted_by
        WHERE gle.company_id = $2
          AND (
            gle.source_document_id = ANY($1::uuid[])
            OR gle.source_journal_id = ANY($1::uuid[])
          )
        ORDER BY gle.transaction_id ASC;
      `;

    //   console.log('query ==== ',query);
    //   console.log('targetSourceIds ==== ',targetSourceIds);
    //   console.log('companyId ==== ',companyId);

      const result = await client.query(query, [targetSourceIds, companyId]);

      const latestEntry = result.rows[result.rows.length - 1];

      const posted_at = latestEntry?.created_at
        ? new Date(latestEntry.created_at)
            .toISOString()
            .slice(0, 10)
            .split("-")
            .reverse()
            .join("/")
        : "";

      return NextResponse.json({
        success: true,
        data: result.rows,
        posted_by: latestEntry?.user_id || "System",
        posted_at: posted_at,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[GET_SALES_INVOICE_POSTED_ENTRIES_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ledger entries." },
      { status: 500 },
    );
  }
}