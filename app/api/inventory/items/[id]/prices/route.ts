// /api/inventory/items/[id]/prices/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  const { id } = await params;

  const body = await req.json();

  const {
    price_type,
    uom_id,
    currency_id,
    price,
    minimum_price,
    start_date,
    end_date,
    minimum_qty,
    maximum_qty,
    customer_id,
    vendor_id,
    is_default,
  } = body;

  const result = await pool.query(
    `
    INSERT INTO item_prices (
      company_id,
      item_id,
      price_type,
      uom_id,
      currency_id,
      price,
      minimum_price,
      start_date,
      end_date,
      minimum_qty,
      maximum_qty,
      customer_id,
      vendor_id,
      is_default
    )
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *
    `,
    [
      companyId,
      id,
      price_type,
      uom_id,
      currency_id,
      price,
      minimum_price,
      start_date,
      end_date,
      minimum_qty,
      maximum_qty,
      customer_id,
      vendor_id,
      is_default,
    ],
  );

  return NextResponse.json(result.rows[0]);
}
