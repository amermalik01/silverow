// app/api/inventory/items/[id]/purchase-prices/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { QueryResultRow } from "pg";

type PurchasePriceRow = {
  id: string;
  item_id: string;
  uom_id: string | null;
  uom_name?: string | null;
  price: string;
  minimum_price: string | null;
  start_date: string | null;
  end_date: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  const itemId = params.id;

  const result: QueryResultRow[] = (
    await pool.query(
      `
      SELECT
        ip.id,
        ip.item_id,
        ip.uom_id,
        u.name AS uom_name,
        ip.price,
        ip.minimum_price,
        ip.start_date,
        ip.end_date
      FROM item_prices ip
      LEFT JOIN uoms u
        ON u.id = ip.uom_id
      WHERE ip.item_id = $1
        AND ip.company_id = $2
        AND ip.price_type = 2
      ORDER BY ip.start_date DESC NULLS LAST
      `,
      [itemId, companyId],
    )
  ).rows;

  return NextResponse.json(result as PurchasePriceRow[]);
}
