// app/api/sales/orders/resolve-price/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customer_id");
  const itemId = searchParams.get("item_id");
  const postingDate = searchParams.get("posting_date") || new Date().toISOString().split("T")[0];
  const quantity = Number(searchParams.get("quantity") || 1);

  if (!itemId) {
    return NextResponse.json({ error: "item_id is required" }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    // 1. Fetch standard item price as fallback
    const itemRes = await client.query(
      `SELECT standard_sales_price FROM items WHERE id = $1 AND company_id = $2`,
      [itemId, companyId]
    );

    if (itemRes.rowCount === 0) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    let unitPrice = Number(itemRes.rows[0].standard_sales_price || 0);

    // 2. Find matching active price list item rule for this customer & date
    // Priority: Customer-specific list first, then general global sales list
    const priceQuery = `
      SELECT 
        pli.offered_price,
        pli.id AS price_list_item_id,
        pli.has_volume_discount
      FROM price_list_items pli
      JOIN price_lists pl ON pli.price_list_id = pl.id
      WHERE pli.item_id = $1 
        AND pl.company_id = $2 
        AND pl.list_type = 'SALES'
        AND pl.status = 1
        AND pl.start_date <= $3 
        AND pl.end_date >= $3
        AND (pl.party_id = $4 OR pl.party_id IS NULL)
      ORDER BY CASE WHEN pl.party_id IS NOT NULL THEN 0 ELSE 1 END ASC
      LIMIT 1
    `;

    const priceRes = await client.query(priceQuery, [itemId, companyId, postingDate, customerId || null]);

    if (priceRes.rowCount && priceRes.rowCount > 0) {
      const rule = priceRes.rows[0];
      unitPrice = Number(rule.offered_price || unitPrice);

      // 3. Check for applicable Volume Discount tiers based on order quantity
      if (rule.has_volume_discount) {
        const vdRes = await client.query(
          `
          SELECT discount_type, discount_value, discounted_price
          FROM price_list_volume_discounts
          WHERE price_list_item_id = $1 AND min_order_qty <= $2
          ORDER BY min_order_qty DESC
          LIMIT 1
          `,
          [rule.price_list_item_id, quantity]
        );

        if (vdRes.rowCount && vdRes.rowCount > 0) {
          const vd = vdRes.rows[0];
          if (vd.discounted_price && Number(vd.discounted_price) > 0) {
            unitPrice = Number(vd.discounted_price);
          } else if (vd.discount_type === "PERCENTAGE") {
            unitPrice = unitPrice * (1 - Number(vd.discount_value) / 100);
          } else if (vd.discount_type === "FIXED_AMOUNT") {
            unitPrice = Math.max(0, unitPrice - Number(vd.discount_value));
          }
        }
      }
    }

    return NextResponse.json({ unit_price: unitPrice }, { status: 200 });
  } catch (err) {
    console.error("Resolve price error:", err);
    return NextResponse.json({ error: "Failed to resolve price" }, { status: 500 });
  } finally {
    client.release();
  }
}