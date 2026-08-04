// app/api/purchase-invoices/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
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
        { status: 401 }
      );
    }

    const client = await pool.connect();

    try {
      // Join with parties (p) for Supplier info & fallback posting groups
      const invoiceRes = await client.query(
        `SELECT 
          pi.*,
          COALESCE(po.supplier_posting_group_id, p.purchase_posting_group_id) AS purchase_posting_group_id,
          po.vat_business_posting_group_id,
          p.name AS supplier_name,
          p.supplier_code AS supplier_no,
          po.order_no AS purchase_order_no
         FROM purchase_invoices pi
         LEFT JOIN parties p ON p.id = pi.supplier_id
         LEFT JOIN purchase_orders po ON po.id = pi.purchase_order_id
         WHERE pi.id = $1 AND pi.company_id = $2`,
        [id, companyId]
      );

      if (!invoiceRes.rows.length) {
        return NextResponse.json(
          { success: false, error: "Purchase invoice not found" },
          { status: 404 }
        );
      }

      // Load Lines joined with items (item_code)
      const linesRes = await client.query(
        `SELECT 
          pil.*,
          i.item_code,
          i.name AS item_name
         FROM purchase_invoice_lines pil
         LEFT JOIN items i ON i.id = pil.item_id AND i.company_id = $2
         WHERE pil.purchase_invoice_id = $1 AND pil.company_id = $2
         ORDER BY pil.line_no ASC`,
        [id, companyId]
      );

      return NextResponse.json({
        success: true,
        data: {
          invoice: invoiceRes.rows[0],
          lines: linesRes.rows,
        },
      });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[GET_PURCHASE_INVOICE_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch purchase invoice details." },
      { status: 500 }
    );
  }
}