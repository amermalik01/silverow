// app/api/inventory/items/[id]/price-offers/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      SELECT 
        pli.id AS price_list_item_id,
        pl.id AS price_list_id,
        pl.name AS price_list_name,
        pl.list_type,
        pl.party_id,
        COALESCE(p.name, 'General List') AS party_name,
        CASE 
          WHEN pl.list_type = 'SALES' THEN 'customer'
          ELSE 'supplier'
        END AS party_type,
        pli.uom_id,
        pli.standard_price,
        pli.offered_price,
        pli.min_order_qty,
        pli.max_order_qty,
        pli.has_volume_discount,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', vd.id,
                'min_order_qty', vd.min_order_qty,
                'discount_type', vd.discount_type,
                'discount_value', vd.discount_value,
                'discounted_price', vd.discounted_price
              )
            ) FROM price_list_volume_discounts vd WHERE vd.price_list_item_id = pli.id
          ), '[]'::json
        ) AS volume_discounts
      FROM price_list_items pli
      JOIN price_lists pl ON pli.price_list_id = pl.id
      LEFT JOIN parties p ON pl.party_id = p.id
      WHERE pli.item_id = $1 AND pl.company_id = $2
      `,
      [id, companyId],
    );

    return NextResponse.json({ priceOffers: result.rows }, { status: 200 });
  } catch (err) {
    console.error("Failed to fetch item price offers:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
