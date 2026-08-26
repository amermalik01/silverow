// app/api/posted-debit-notes/[id]/posted-entries/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id: debitNoteId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const client = await pool.connect();

    try {
      const targetSourceIds: string[] = [debitNoteId];

      const dispatchesRes = await client.query(
        `SELECT DISTINCT stock_dispatch_id 
         FROM stock_dispatch_lines sdl
         INNER JOIN debit_note_lines dnl ON dnl.id = sdl.debit_note_line_id
         WHERE dnl.debit_note_id = $1 AND dnl.company_id = $2`,
        [debitNoteId, companyId],
      );

      dispatchesRes.rows.forEach((r) => {
        if (r.stock_dispatch_id) {
          targetSourceIds.push(r.stock_dispatch_id);
        }
      });

      const result = await client.query(
        `SELECT * FROM (
          -- Standard Journal Entries (Debit Notes & Stock Dispatches)
          SELECT 
            jel.entry_no::text AS entry_no,
            je.entry_date AS posting_date,
            CASE 
              WHEN je.journal_type::text = 'DEBIT_NOTE' THEN 'Debit Note'
              WHEN je.journal_type::text = 'STOCK_DISPATCH' THEN 'Stock Dispatch'
              WHEN je.journal_type::text = 'PURCHASE_DEBIT_NOTE' THEN 'Debit Note'
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

          -- Realized FX Variance Entries for Debit Notes
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
          LEFT JOIN chart_of_accounts coa ON coa.id = gle.account_id
          LEFT JOIN parties p ON p.id = gle.party_id
          LEFT JOIN users u ON u.id = gle.posted_by
          WHERE gle.company_id = $2 
            AND gle.source_type::text = 'FX_VARIANCE'
            AND (la.ledger_entry_id = $3 OR la.payment_entry_id = $3)
        ) combined_entries
        ORDER BY posting_date ASC, created_at ASC`,
        [targetSourceIds, companyId, debitNoteId],
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
    console.error("[GET_DEBIT_NOTE_POSTED_ENTRIES_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ledger entries." },
      { status: 500 },
    );
  }
}

/* export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id: debitNoteId } = await params;

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const client = await pool.connect();

    try {
      // 1. Resolve document IDs (Debit Note ID + any linked Stock Dispatches)
      const targetSourceIds: string[] = [debitNoteId];

      const dispatchesRes = await client.query(
        `SELECT DISTINCT stock_dispatch_id 
         FROM stock_dispatch_lines sdl
         INNER JOIN debit_note_lines dnl ON dnl.id = sdl.debit_note_line_id
         WHERE dnl.debit_note_id = $1 AND dnl.company_id = $2`,
        [debitNoteId, companyId],
      );

      dispatchesRes.rows.forEach((r) => {
        if (r.stock_dispatch_id) {
          targetSourceIds.push(r.stock_dispatch_id);
        }
      });

      // 2. Fetch journal entries for all related source documents
      const result = await client.query(
        `SELECT 
          jel.entry_no AS entry_no,
          je.entry_date AS posting_date,
          CASE 
            WHEN je.journal_type = 'DEBIT_NOTE' THEN 'Debit Note'
            WHEN je.journal_type = 'STOCK_DISPATCH' THEN 'Stock Dispatch'
            WHEN je.journal_type = 'PURCHASE_DEBIT_NOTE' THEN 'Debit Note'
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
         ORDER BY jel.entry_no ASC`,
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
    console.error("[GET_DEBIT_NOTE_POSTED_ENTRIES_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ledger entries." },
      { status: 500 },
    );
  }
} */
