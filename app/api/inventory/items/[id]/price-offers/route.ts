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
        COALESCE(
          CASE 
            WHEN pl.list_type = 'SALES' AND p.customer_code IS NOT NULL AND p.customer_code <> '' THEN p.customer_code || ' - ' || p.name
            WHEN pl.list_type = 'PURCHASE' AND p.supplier_code IS NOT NULL AND p.supplier_code <> '' THEN p.supplier_code || ' - ' || p.name
            ELSE p.name
          END, 
          'General / Global List'
        ) AS party_name,
        CASE 
          WHEN pl.list_type = 'SALES' THEN 'customer'
          ELSE 'supplier'
        END AS party_type,
        to_char(pl.start_date, 'YYYY-MM-DD') AS start_date,
        to_char(pl.end_date, 'YYYY-MM-DD') AS end_date,
        pl.currency_id,
        pli.uom_id,

        ROUND(pli.standard_price::numeric, 2) AS standard_price,
        ROUND(pli.offered_price::numeric, 2) AS offered_price,
        ROUND(pli.min_order_qty::numeric, 0) AS min_order_qty,
        ROUND(pli.max_order_qty::numeric, 0) AS max_order_qty,

        pli.has_volume_discount,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', vd.id,
                'min_order_qty', ROUND(vd.min_order_qty::numeric, 2),
                'discount_type', vd.discount_type,
                'discount_value', ROUND(vd.discount_value::numeric, 2),
                'discounted_price', ROUND(vd.discounted_price::numeric, 2)
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

/* export async function GET(_: Request, { params }: Props) {
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

        ROUND(pli.standard_price::numeric, 2) AS standard_price,
        ROUND(pli.offered_price::numeric, 2) AS offered_price,
        ROUND(pli.min_order_qty::numeric, 0) AS min_order_qty,
        ROUND(pli.max_order_qty::numeric, 0) AS max_order_qty,



        pli.has_volume_discount,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', vd.id,
                'min_order_qty', ROUND(vd.min_order_qty::numeric, 2),
                'discount_type', vd.discount_type,
                'discount_value', ROUND(vd.discount_value::numeric, 2),
                'discounted_price', ROUND(vd.discounted_price::numeric, 2)
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
 */
