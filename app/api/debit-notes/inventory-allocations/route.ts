// app/api/debit-notes/inventory-allocations/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: NextRequest) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const purchaseInvoiceLineId = searchParams.get("purchase_invoice_line_id");
    const purchaseOrderLineId = searchParams.get("purchase_order_line_id");
    const debitNoteLineId = searchParams.get("debit_note_line_id");

    if (!purchaseInvoiceLineId && !debitNoteLineId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Either purchase_invoice_line_id or debit_note_line_id is required",
        },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT 
           ia.id, 
           ia.purchase_order_line_id,
           ia.purchase_invoice_line_id, 
           ia.debit_note_line_id,
           ia.batch_no, 
           ia.bin_code,
           TO_CHAR(ia.expiry_date, 'YYYY-MM-DD') AS expiry_date, 
           ia.allocated_quantity, 
           ia.unit_cost,
           ia.warehouse_location_id AS location_id,
           wl.title AS location_name
         FROM public.inventory_allocations ia
         LEFT JOIN public.warehouse_locations wl ON wl.id = ia.warehouse_location_id
         LEFT JOIN public.purchase_invoice_lines pil ON pil.id = $3::uuid
         WHERE ia.company_id = $1 
           AND (
             ($2::uuid IS NOT NULL AND ia.debit_note_line_id = $2::uuid)
             OR 
             ($4::uuid IS NOT NULL AND ia.purchase_order_line_id = $4::uuid)
             OR 
             ($3::uuid IS NOT NULL AND (
               ia.purchase_invoice_line_id = $3::uuid 
               OR (pil.purchase_order_line_id IS NOT NULL AND ia.purchase_order_line_id = pil.purchase_order_line_id)
             ))
           )`,
        [
          companyId,
          debitNoteLineId || null,
          purchaseInvoiceLineId || null,
          purchaseOrderLineId || null,
        ],
      );

      return NextResponse.json({ success: true, data: res.rows });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("[GET_INVENTORY_ALLOCATIONS_ERROR]:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch allocations." },
      { status: 500 },
    );
  }
}
/* 
const res = await client.query(
        `SELECT id, purchase_invoice_line_id, batch_no, expiry_date, allocated_quantity, unit_cost 
         FROM inventory_allocations 
         WHERE company_id = $1 AND purchase_invoice_line_id = $2 AND status = 'ACTIVE'`,
        [companyId, purchaseInvoiceLineId],
      );
*/
