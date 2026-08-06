// app/api/inventory-allocations/route.ts

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

    if (!purchaseInvoiceLineId) {
      return NextResponse.json(
        { success: false, error: "Missing purchase_invoice_line_id" },
        { status: 400 },
      );
    }

    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT id, purchase_invoice_line_id, batch_no, expiry_date, allocated_quantity, unit_cost 
         FROM inventory_allocations 
         WHERE company_id = $1 AND purchase_invoice_line_id = $2 AND status = 'ACTIVE'`,
        [companyId, purchaseInvoiceLineId],
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
