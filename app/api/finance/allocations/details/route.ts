// app/api/finance/allocations/details/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ledgerEntryId = searchParams.get("ledger_entry_id");

    if (!ledgerEntryId) {
      return NextResponse.json(
        { error: "ledger_entry_id parameter is required" },
        { status: 400 },
      );
    }

    // Query entries where ledgerEntryId is EITHER the target invoice OR the payment voucher
    const result = await pool.query(
      `
      SELECT 
        la.id,
        la.allocation_date,
        la.allocated_amount_fcy,
        la.realized_gain_loss,
        CASE 
          WHEN la.payment_entry_id = $2 THEN target_vle.document_type
          ELSE pay_vle.document_type
        END AS document_type,
        CASE 
          WHEN la.payment_entry_id = $2 THEN target_vle.document_no
          ELSE pay_vle.document_no
        END AS document_no,
        CASE 
          WHEN la.payment_entry_id = $2 THEN target_po.po_number
          ELSE pay_po.po_number
        END AS order_no
      FROM ledger_allocations la
      LEFT JOIN vendor_ledger_entries pay_vle ON pay_vle.id = la.payment_entry_id
      LEFT JOIN vendor_ledger_entries target_vle ON target_vle.id = la.ledger_entry_id
      LEFT JOIN purchase_invoices target_pi ON target_pi.id = target_vle.document_id AND target_vle.document_type = 'PURCHASE_INVOICE'
      LEFT JOIN purchase_orders target_po ON target_po.id = target_pi.purchase_order_id
      LEFT JOIN purchase_invoices pay_pi ON pay_pi.id = pay_vle.document_id AND pay_vle.document_type = 'PURCHASE_INVOICE'
      LEFT JOIN purchase_orders pay_po ON pay_po.id = pay_pi.purchase_order_id
      WHERE la.company_id = $1 
        AND (la.payment_entry_id = $2 OR la.ledger_entry_id = $2)
        AND la.is_unapplied = false
      ORDER BY la.allocation_date DESC, la.created_at DESC
      `,
      [companyId, ledgerEntryId],
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    const dbError = err as { code?: string; message?: string };

    return NextResponse.json(
      { error: dbError.message || "Failed to load" },
      { status: 500 },
    );
  }
}
