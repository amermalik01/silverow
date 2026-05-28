// app/api/setup/posting/inventory-groups/route.ts

import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Swapped account_code with code
    const result = await pool.query(
      `SELECT g.id, g.name, g.inventory_account_id, g.cogs_account_id, g.adjustment_account_id,
              CONCAT(a1.code, ' - ', a1.name) as inventory_account,
              CONCAT(a2.code, ' - ', a2.name) as cogs_account,
              CONCAT(a3.code, ' - ', a3.name) as adjustment_account
       FROM inventory_posting_groups g
       LEFT JOIN chart_of_accounts a1 ON g.inventory_account_id = a1.id
       LEFT JOIN chart_of_accounts a2 ON g.cogs_account_id = a2.id
       LEFT JOIN chart_of_accounts a3 ON g.adjustment_account_id = a3.id
       WHERE g.company_id = $1 ORDER BY g.name`,
      [session.user.company_id],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Inventory Groups GET Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = await req.json();

    const result = await pool.query(
      `INSERT INTO inventory_posting_groups 
       (company_id, name, inventory_account_id, cogs_account_id, adjustment_account_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        session.user.company_id,
        b.name,
        b.inventory_account_id,
        b.cogs_account_id,
        b.adjustment_account_id,
      ],
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Inventory Groups POST Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
