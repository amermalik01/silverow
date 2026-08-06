// app/api/finance/suppliers/[vendorId]/open-invoices/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { vendorId: string } },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vendorId } = params;

    const result = await pool.query(
      `
      SELECT 
        vle.id,
        vle.document_no,
        vle.document_type,
        vle.posting_date,
        vle.due_date,
        vle.original_amount,
        vle.remaining_amount,
        vle.currency_id,
        pi.purchase_order_id,
        po.order_no
      FROM vendor_ledger_entries vle
      LEFT JOIN purchase_invoices pi ON pi.id = vle.document_id AND vle.document_type = 'PURCHASE_INVOICE'
      LEFT JOIN purchase_orders po ON po.id = pi.purchase_order_id
      WHERE vle.company_id = $1 
        AND vle.vendor_id = $2 
        AND vle.is_open = true 
        AND vle.remaining_amount > 0
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
}
