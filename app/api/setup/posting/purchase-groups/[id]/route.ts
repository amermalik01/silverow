// app/api/setup/posting/purchase-groups/[id]/route.ts

import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const b = await req.json();

    await pool.query(
      `UPDATE purchase_posting_groups SET 
        name = $1, 
        payable_account_id = $2, 
        purchase_account_id = $3, 
        discount_account_id = $4, 
        vat_account_id = $5, 
        inventory_account_id = $6,
        grni_account_id = $7
       WHERE id = $8`,
      [
        b.name,
        b.payable_account_id,
        b.purchase_account_id,
        b.discount_account_id || null,
        b.vat_account_id || null,
        b.inventory_account_id || null,
        b.grni_account_id || null,
        id,
      ],
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Purchase Groups PUT Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await pool.query(`DELETE FROM purchase_posting_groups WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Purchase Groups DELETE Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
