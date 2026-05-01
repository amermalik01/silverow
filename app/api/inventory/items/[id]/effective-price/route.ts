// api/inventory/items/[id]/effective-price/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type PriceResult = {
  price: number;
  source: "price_list" | "item_price" | "none";
  price_type: 1 | 2;
  uom_id: string | null;
};

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, { params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  const { searchParams } = new URL(req.url);

  const qty = Number(searchParams.get("qty") || 1);
  const customerId = searchParams.get("customer_id");
  const vendorId = searchParams.get("vendor_id");
  //   const priceType = Number(searchParams.get("price_type") || 1);
  const rawPriceType = Number(searchParams.get("price_type") || 1);

  const priceType: 1 | 2 = rawPriceType === 2 ? 2 : 1;

  const { id } = await params;

  const itemId = id;

  // ----------------------------------------------------
  // STEP 1: PRICE LIST RULES (HIGHEST PRIORITY)
  // ----------------------------------------------------

  const priceListResult = await pool.query(
    `
    SELECT pli.price,
           pli.uom_id,
           pl.price_list_type
    FROM price_list_items pli
    INNER JOIN price_lists pl ON pl.id = pli.price_list_id
    WHERE pli.item_id = $1
      AND pl.company_id = $2
      AND pl.status = 1
      AND (pl.valid_from IS NULL OR pl.valid_from <= CURRENT_DATE)
      AND (pl.valid_to IS NULL OR pl.valid_to >= CURRENT_DATE)
      AND (pli.min_qty IS NULL OR pli.min_qty <= $3)
      AND (pli.max_qty IS NULL OR pli.max_qty >= $3)
      AND (
        ($4::uuid IS NULL OR pl.customer_id = $4)
        OR ($5::uuid IS NULL OR pl.vendor_id = $5)
      )
    ORDER BY pl.price_list_type DESC, pli.price ASC
    LIMIT 1
    `,
    [itemId, companyId, qty, customerId, vendorId],
  );

  if (priceListResult.rows.length > 0) {
    const row = priceListResult.rows[0];

    const response: PriceResult = {
      price: Number(row.price),
      source: "price_list",
      price_type: priceType,
      uom_id: row.uom_id,
    };

    return NextResponse.json(response);
  }

  // ----------------------------------------------------
  // STEP 2: ITEM PRICE TABLE (FALLBACK)
  // ----------------------------------------------------

  const itemPriceResult = await pool.query(
    `
    SELECT price,
           uom_id
    FROM item_prices
    WHERE item_id = $1
      AND company_id = $2
      AND price_type = $3
      AND (start_date IS NULL OR start_date <= CURRENT_DATE)
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      AND (minimum_qty IS NULL OR minimum_qty <= $4)
      AND (maximum_qty IS NULL OR maximum_qty >= $4)
    ORDER BY is_default DESC, price ASC
    LIMIT 1
    `,
    [itemId, companyId, priceType, qty],
  );

  if (itemPriceResult.rows.length > 0) {
    const row = itemPriceResult.rows[0];

    const response: PriceResult = {
      price: Number(row.price),
      source: "item_price",
      price_type: priceType,
      uom_id: row.uom_id,
    };

    return NextResponse.json(response);
  }

  // ----------------------------------------------------
  // STEP 3: NO PRICE FOUND
  // ----------------------------------------------------

  return NextResponse.json(
    {
      price: 0,
      source: "none",
      price_type: priceType,
      uom_id: null,
    },
    { status: 200 },
  );
}
