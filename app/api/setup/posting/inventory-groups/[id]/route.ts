// app/api/setup/posting/inventory-groups/[id]/route.ts

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
      `UPDATE inventory_posting_groups SET 
        name = $1, inventory_account_id = $2, cogs_account_id = $3, adjustment_account_id = $4
       WHERE id = $5`,
      [
        b.name,
        b.inventory_account_id,
        b.cogs_account_id,
        b.adjustment_account_id,
        id,
      ],
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inventory Groups PUT Error:", error);
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
    await pool.query(`DELETE FROM inventory_posting_groups WHERE id = $1`, [
      id,
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Inventory Groups DELETE Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
