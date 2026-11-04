// app/api/finance/suppliers/[vendorId]/open-invoices/route.ts

import { NextRequest, NextResponse } from "next/server";
import type { QueryResultRow } from "pg";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

interface OpenInvoiceRow extends QueryResultRow {
  id: string;
  document_no: string | null;
  document_type: string;
  posting_date: string | Date | null;
  due_date: string | Date | null;
  original_amount_fcy: string | number | null;
  remaining_amount_fcy: string | number | null;
  currency_id: string | null;
  purchase_order_id: string | null;
  order_no: string | null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  try {
    const companyId = await getCompanyId();

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vendorId } = await params;

    const result = await pool.query<OpenInvoiceRow>(
      `
      SELECT
        vle.id,
        vle.document_no,
        vle.document_type,
        vle.posting_date,
        vle.due_date,
        vle.original_amount_fcy,
        vle.remaining_amount_fcy,
        vle.currency_id,

        CASE
          WHEN vle.document_type = 'PURCHASE_INVOICE'
            THEN po.id
          ELSE NULL
        END AS purchase_order_id,

        po.order_no

      FROM vendor_ledger_entries vle

      LEFT JOIN purchase_orders po
        ON po.id = vle.document_id
       AND po.company_id = vle.company_id
       AND vle.document_type = 'PURCHASE_INVOICE'

      WHERE vle.company_id = $1
        AND vle.vendor_id = $2
        AND vle.document_type = 'PURCHASE_INVOICE'
        AND vle.is_open = true
        AND vle.remaining_amount_fcy > 0

      ORDER BY
        vle.posting_date ASC,
        vle.created_at ASC
      `,
      [companyId, vendorId],
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("[GET_SUPPLIER_OPEN_INVOICES_ERROR]:", err);

    const dbError = err as { message?: string };

    return NextResponse.json(
      { error: dbError.message || "Failed to load supplier invoices." },
      { status: 500 },
    );
  }
}
/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vendorId } = await params;

    const result = await pool.query(
      `
      SELECT 
        vle.id,
        vle.document_no,
        vle.document_type,
        vle.posting_date,
        vle.due_date,
        vle.original_amount_fcy,
        vle.remaining_amount_fcy,
        vle.currency_id,
        pi.purchase_order_id,
        po.order_no
      FROM vendor_ledger_entries vle
      LEFT JOIN purchase_invoices pi ON pi.id = vle.document_id AND vle.document_type = 'PURCHASE_INVOICE'
      LEFT JOIN purchase_orders po ON po.id = pi.purchase_order_id
      WHERE vle.company_id = $1 
        AND vle.vendor_id = $2 
        AND vle.is_open = true 
        AND vle.remaining_amount_fcy > 0
      ORDER BY vle.posting_date ASC, vle.created_at ASC
      `,
      [companyId, vendorId],
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    return NextResponse.json(
      { error: dbError.message || "Failed to load supplier Invoices" },
      { status: 500 },
    );
  }
} */
