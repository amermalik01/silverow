// app/api/setup/posting/sales-groups/[id]/route.ts

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
      `UPDATE sales_posting_groups SET 
        posting_group_id = $1, receivable_account_id = $2, sales_account_id = $3, discount_account_id = $4, vat_account_id = $5
       WHERE id = $6`,
      [
        b.posting_group_id,
        b.receivable_account_id,
        b.sales_account_id,
        b.discount_account_id,
        b.vat_account_id,
        id,
      ],
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sales Groups PUT Error:", error);
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
    await pool.query(`DELETE FROM sales_posting_groups WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sales Groups DELETE Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
