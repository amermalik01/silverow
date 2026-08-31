// app/api/purchase-invoices/[id]/posted-entries/route.ts

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
      // 1. Trace related documents (Linked Purchase Order & Goods Receipts)
      const docQuery = await client.query(
        `SELECT pi.purchase_order_id
         FROM purchase_invoices pi
         WHERE pi.id = $1 AND pi.company_id = $2`,
        [invoiceId, companyId],
      );

      const purchaseOrderId = docQuery.rows[0]?.purchase_order_id || null;
      const targetSourceIds: string[] = [invoiceId];

      if (purchaseOrderId) {
        const receiptsRes = await client.query(
          `SELECT id FROM purchase_receipts 
           WHERE purchase_order_id = $1 AND company_id = $2`,
          [purchaseOrderId, companyId],
        );
        receiptsRes.rows.forEach((r) => targetSourceIds.push(r.id));
      }

      // 2. Fetch all postings directly from gl_ledger_entries
      const query = `
        SELECT 
          gle.transaction_id AS entry_no,
          gle.posting_date,
          CASE 
            WHEN gle.source_type::text = 'PURCHASE_RECEIPT' THEN 'Purchase Receipt'
            WHEN gle.source_type::text = 'PURCHASE_INVOICE' THEN 'Purchase Invoice'
            WHEN gle.source_type::text = 'FX_VARIANCE' THEN 'Realized FX Variance'
            ELSE gle.source_type::text
          END AS document_type,
          COALESCE(gle.document_no, gle.source_document_no, gle.entry_no) AS document_number,
          coa.code AS gl_no,
          coa.name AS name,
          COALESCE(p.supplier_code, gle.reference, '') AS source_no,
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
        ORDER BY gle.posting_date ASC, gle.posted_at ASC
      `;

      // console.log('Posted invoice entries query === ',query);
      // console.log('targetSourceIds === ',targetSourceIds);

      const result = await client.query(query, [targetSourceIds, companyId]);

      const latestEntry = result.rows[result.rows.length - 1];

      // const posted_at = latestEntry?.created_at ? new Date(latestEntry.created_at).toLocaleDateString("en-GB") : "";
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
        // posted_at: latestEntry?.created_at
        //   ? new Date(latestEntry.created_at).toLocaleString()
        //   : "",
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[GET_PURCHASE_INVOICE_POSTED_ENTRIES_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ledger entries." },
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const client = await pool.connect();

    try {
      // 1. Resolve document details (Invoice No & linked Purchase Receipts)
      const docQuery = await client.query(
        `SELECT pi.id AS invoice_id, pi.invoice_no, pi.purchase_order_id
         FROM purchase_invoices pi
         WHERE pi.id = $1 AND pi.company_id = $2`,
        [id, companyId],
      );

      const invoiceDoc = docQuery.rows[0];
      const invoiceId = id;
      const invoiceNo = invoiceDoc?.invoice_no || "";
      const purchaseOrderId = invoiceDoc?.purchase_order_id || null;

      const targetSourceIds: string[] = [invoiceId];

      if (purchaseOrderId) {
        const receiptsRes = await client.query(
          `SELECT id FROM purchase_receipts 
           WHERE purchase_order_id = $1 AND company_id = $2`,
          [purchaseOrderId, companyId],
        );
        receiptsRes.rows.forEach((r) => targetSourceIds.push(r.id));
      }

      // 2. Query both journal entries and allocation FX GL entries
      const result = await client.query(
        `SELECT * FROM (
          -- Standard Journal Entries (Receipts & Invoices)
          SELECT 
            jel.entry_no::text AS entry_no,
            je.entry_date AS posting_date,
            CASE 
              WHEN je.journal_type::text = 'PURCHASE_RECEIPT' THEN 'Purchase Receipt'
              WHEN je.journal_type::text = 'PURCHASE_INVOICE' THEN 'Purchase Invoice'
              ELSE je.journal_type::text
            END AS document_type,
            je.reference::text AS document_number,
            coa.code AS gl_no,
            coa.name AS name,
            COALESCE(p.supplier_code, '') AS source_no,
            jel.debit,
            jel.credit,
            (jel.debit - jel.credit) AS amount_lcy,
            u.name AS user_id,
            je.created_at
          FROM journal_entry_lines jel
          INNER JOIN journal_entries je ON je.id = jel.journal_id
          LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id
          LEFT JOIN parties p ON p.id = jel.party_id
          LEFT JOIN users u ON u.id = je.created_by
          WHERE je.company_id = $2
            AND (
              je.source_id = ANY($1::uuid[]) 
              OR jel.reference_id = ANY($1::uuid[])
            )

          UNION ALL

          -- Realized FX Variance Entries from Allocations
          SELECT 
            gle.entry_no::text AS entry_no,
            gle.posting_date,
            'Realized FX Variance' AS document_type,
            COALESCE(gle.document_no, gle.entry_no::text) AS document_number,
            coa.code AS gl_no,
            coa.name AS name,
            COALESCE(p.supplier_code, '') AS source_no,
            gle.debit,
            gle.credit,
            (gle.debit - gle.credit) AS amount_lcy,
            COALESCE(u.name, 'System') AS user_id,
            gle.posted_at AS created_at
          FROM gl_ledger_entries gle
          INNER JOIN ledger_allocations la ON gle.reference = CONCAT('ALLOC_FX_', la.id)
          INNER JOIN vendor_ledger_entries vle ON la.ledger_entry_id = vle.id
          LEFT JOIN chart_of_accounts coa ON coa.id = gle.account_id
          LEFT JOIN parties p ON p.id = gle.party_id
          LEFT JOIN users u ON u.id = gle.posted_by
          WHERE gle.company_id = $2 
            AND gle.source_type::text = 'FX_VARIANCE'
            AND (vle.document_no = $3 OR la.ledger_entry_id = $4)
        ) combined_entries
        ORDER BY posting_date ASC, created_at ASC`,
        [targetSourceIds, companyId, invoiceNo, invoiceId],
      );

      const latestEntry = result.rows[result.rows.length - 1];

      return NextResponse.json({
        success: true,
        data: result.rows,
        posted_by: latestEntry?.user_id || "System",
        posted_at: latestEntry?.created_at
          ? new Date(latestEntry.created_at).toLocaleString()
          : "",
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[GET_POSTED_ENTRIES_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ledger entries." },
      { status: 500 },
    );
  }
} */

/* export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const client = await pool.connect();

    try {
      // 1. Resolve document IDs (Invoice ID + parent PO ID + linked Receipt IDs)
      const docQuery = await client.query(
        `SELECT pi.id AS invoice_id, pi.purchase_order_id
         FROM purchase_invoices pi
         WHERE pi.id = $1 AND pi.company_id = $2`,
        [id, companyId],
      );

      const invoiceId = id;
      const purchaseOrderId = docQuery.rows[0]?.purchase_order_id || null;

      // Collect all related source_ids to pull GL entries for (Invoice + all linked Receipts)
      const targetSourceIds: string[] = [invoiceId];

      if (purchaseOrderId) {
        // Find all purchase receipts linked to this purchase order
        const receiptsRes = await client.query(
          `SELECT id FROM purchase_receipts 
           WHERE purchase_order_id = $1 AND company_id = $2`,
          [purchaseOrderId, companyId],
        );
        receiptsRes.rows.forEach((r) => targetSourceIds.push(r.id));
      }

      // 2. Fetch journal entries for all related source documents
      const result = await client.query(
        `SELECT 
          jel.entry_no AS entry_no,
          je.entry_date AS posting_date,
          CASE 
            WHEN je.journal_type = 'PURCHASE_RECEIPT' THEN 'Purchase Receipt'
            WHEN je.journal_type = 'PURCHASE_INVOICE' THEN 'Purchase Invoice'
            ELSE je.journal_type
          END AS document_type,
          je.reference AS document_number,
          coa.code AS gl_no,
          coa.name AS name,
          COALESCE(p.supplier_code, '') AS source_no,
          jel.debit,
          jel.credit,
          (jel.debit - jel.credit) AS amount_lcy,
          u.name AS user_id,
          je.created_at
         FROM journal_entry_lines jel
         INNER JOIN journal_entries je ON je.id = jel.journal_id
         LEFT JOIN chart_of_accounts coa ON coa.id = jel.account_id
         LEFT JOIN parties p ON p.id = jel.party_id
         LEFT JOIN users u ON u.id = je.created_by
         WHERE je.company_id = $2
           AND (
             je.source_id = ANY($1::uuid[]) 
             OR jel.reference_id = ANY($1::uuid[])
           )
         ORDER BY je.entry_date ASC, je.created_at ASC, jel.line_no ASC`,
        [targetSourceIds, companyId],
      );

      const latestEntry = result.rows[result.rows.length - 1];

      return NextResponse.json({
        success: true,
        data: result.rows,
        posted_by: latestEntry?.user_id || "System",
        posted_at: latestEntry?.created_at
          ? new Date(latestEntry.created_at).toLocaleString()
          : "",
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[GET_POSTED_ENTRIES_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ledger entries." },
      { status: 500 },
    );
  }
} */
