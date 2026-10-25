// app/api/inventory/items/price-history/[priceListItemId]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type Props = {
  params: Promise<{ priceListItemId: string }>;
};

export async function GET(_: Request, { params }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { priceListItemId } = await params;
  const client = await pool.connect();

  try {
    const historyResult = await client.query(
      `
      SELECT 
        h.id,
        h.old_offered_price,
        h.new_offered_price,
        h.old_min_order_qty,
        h.new_min_order_qty,
        h.old_max_order_qty,
        h.new_max_order_qty,
        to_char(h.changed_at, 'YYYY-MM-DD HH24:MI:SS') AS changed_at,
        u.name AS changed_by_name
      FROM price_list_item_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.price_list_item_id = $1
      ORDER BY h.changed_at DESC
      `,
      [priceListItemId]
    );

    return NextResponse.json({ history: historyResult.rows }, { status: 200 });
  } catch (err) {
    console.error("Failed to fetch price history:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    client.release();
  }
}