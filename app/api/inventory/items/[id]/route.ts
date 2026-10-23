// app/api/inventory/items/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ItemSchema, ItemWarehouseSchema } from "@/lib/validations/item.schema";
import { z } from "zod";

type ItemWarehouseInput = z.infer<typeof ItemWarehouseSchema>;

type Props = {
  params: Promise<{ id: string }>;
};

// Helper functions for data sanitization
const toCleanOrNull = (val: unknown) => {
  if (
    !val ||
    typeof val !== "string" ||
    val.trim() === "" ||
    val === "undefined" ||
    val === "null"
  ) {
    return null;
  }
  return val.trim();
};

const toDateOrNull = (val: unknown) => {
  const str = toCleanOrNull(val);
  if (!str) return null;
  const parsedDate = new Date(str);
  return isNaN(parsedDate.getTime()) ? null : str;
};

const toNumberOrDefault = (val: unknown, fallback = 0) => {
  if (val === null || val === undefined || val === "") return fallback;
  const num = Number(val);
  return isNaN(num) ? fallback : num;
};

/* ==========================================================
   1. GET ITEM BY ID (GET /api/inventory/items/[id])
============================================================ */
export async function GET(_: Request, { params }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await pool.connect();

  try {
    const itemResult = await client.query(
      `SELECT * FROM items WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!itemResult.rows[0]) {
      return NextResponse.json(
        { error: "Item record not found" },
        { status: 404 },
      );
    }

    const warehouseResult = await client.query(
      `SELECT 
        id, warehouse_id, storage_location_id, unit_of_measure, cost_frequency, 
        currency, cost, is_default, status, to_char(start_date, 'YYYY-MM-DD') AS start_date, comments
       FROM item_warehouses 
       WHERE item_id = $1 AND company_id = $2 
       ORDER BY is_default DESC, created_at ASC`,
      [id, companyId],
    );

    return NextResponse.json({
      item: itemResult.rows[0],
      warehouses: warehouseResult.rows,
    });
  } catch (err) {
    console.error("Fetch Item Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch item data structure" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* ==========================================================
   2. UPDATE ITEM (PUT)
============================================================ */
export async function PUT(req: Request, { params }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const rawBody = await req.json();
    const itemData = rawBody.item || rawBody;
    const validatedItem = ItemSchema.parse(itemData);

    const rawWarehouses = Array.isArray(rawBody.warehouses)
      ? rawBody.warehouses
      : [];
    const validatedWarehouses: ItemWarehouseInput[] = rawWarehouses
      .filter(
        (w: unknown) =>
          w &&
          typeof w === "object" &&
          (w as Record<string, unknown>).warehouse_id,
      )
      .map((w: unknown) => ItemWarehouseSchema.parse(w));

    const rawPriceOffers = Array.isArray(rawBody.priceOffers)
      ? rawBody.priceOffers
      : [];

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const itemUpdateQuery = `
        UPDATE items SET
          item_code = $1,
          barcode = $2,
          name = $3,
          description = $4,
          category_id = $5,
          brand_id = $6,
          base_uom_id = $7,
          purchase_uom_id = $8,
          sales_uom_id = $9,
          item_type = $10,
          status = $11,
          stock_tracking = $12,
          reorder_qty = $13,
          standard_sales_price = $14,
          standard_cost = $15,
          costing_method = $16,
          inventory_posting_group_id = $17,
          inventory_gl_id = $18,
          cogs_gl_id = $19,
          sales_gl_id = $20,
          purchase_gl_id = $21,
          vat_product_group_id = $22,
          updated_at = NOW()
        WHERE id = $23 AND company_id = $24
        RETURNING *;
      `;

      const itemValues = [
        toCleanOrNull(validatedItem.item_code),
        toCleanOrNull(validatedItem.barcode),
        validatedItem.name.trim(),
        toCleanOrNull(validatedItem.description),
        toCleanOrNull(validatedItem.category_id),
        toCleanOrNull(validatedItem.brand_id),
        validatedItem.base_uom_id,
        toCleanOrNull(validatedItem.purchase_uom_id),
        toCleanOrNull(validatedItem.sales_uom_id),
        toNumberOrDefault(validatedItem.item_type, 1),
        toNumberOrDefault(validatedItem.status, 1),
        !!validatedItem.stock_tracking,
        toNumberOrDefault(validatedItem.reorder_qty, 0),
        toNumberOrDefault(validatedItem.standard_sales_price, 0),
        toNumberOrDefault(validatedItem.standard_cost, 0),
        // toNumberOrDefault(validatedItem.costing_method, 1),
        validatedItem.costing_method,

        toCleanOrNull(validatedItem.inventory_posting_group_id),
        toCleanOrNull(validatedItem.inventory_gl_id),
        toCleanOrNull(validatedItem.cogs_gl_id),
        toCleanOrNull(validatedItem.sales_gl_id),
        toCleanOrNull(validatedItem.purchase_gl_id),
        toCleanOrNull(validatedItem.vat_product_group_id),
        id,
        companyId,
      ];

      const itemResult = await client.query(itemUpdateQuery, itemValues);

      if (itemResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { error: "Item record not found or unauthorized" },
          { status: 404 },
        );
      }

      // Sync child warehouses
      await client.query(
        "DELETE FROM item_warehouses WHERE item_id = $1 AND company_id = $2",
        [id, companyId],
      );

      if (validatedWarehouses.length > 0) {
        const warehouseInsertQuery = `
          INSERT INTO item_warehouses (
            company_id, item_id, warehouse_id, storage_location_id,
            unit_of_measure, cost_frequency, currency, cost,
            is_default, status, start_date, comments
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `;

        for (const wrh of validatedWarehouses) {
          if (wrh.warehouse_id && wrh.warehouse_id.trim() !== "") {
            await client.query(warehouseInsertQuery, [
              companyId,
              id,
              wrh.warehouse_id,
              toCleanOrNull(wrh.storage_location_id),
              toCleanOrNull(wrh.unit_of_measure),
              toCleanOrNull(wrh.cost_frequency),
              toCleanOrNull(wrh.currency),
              toNumberOrDefault(wrh.cost, 0),
              !!wrh.is_default,
              toNumberOrDefault(wrh.status, 1),
              toDateOrNull(wrh.start_date),
              toCleanOrNull(wrh.comments),
            ]);
          }
        }
      }

      // Sync Price Offers & Volume Discounts for this item
      // First, remove existing price list item links associated with this item
      /* const existingPlItems = await client.query(
        `SELECT id FROM price_list_items WHERE item_id = $1`,
        [id],
      );
      if (existingPlItems.rowCount && existingPlItems.rowCount > 0) {
        const pliIds = existingPlItems.rows.map((r) => r.id);
        await client.query(
          `DELETE FROM price_list_volume_discounts WHERE price_list_item_id = ANY($1)`,
          [pliIds],
        );
        await client.query(`DELETE FROM price_list_items WHERE item_id = $1`, [
          id,
        ]);
      }

      // Re-insert submitted price offers
      for (const offer of rawPriceOffers) {
        let priceListId = offer.id;

        if (!priceListId) {
          const plInsertRes = await client.query(
            `
            INSERT INTO price_lists (
              company_id, name, list_type, party_id, offer_method, start_date, end_date, currency_id, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
            RETURNING id
            `,
            [
              companyId,
              offer.name || "Item Price Offer",
              offer.list_type || "SALES",
              toCleanOrNull(offer.party_id),
              offer.offer_method || "Phone",//"Fixed Price",
              toDateOrNull(offer.start_date) || new Date(),
              toDateOrNull(offer.end_date) ||
                new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              toCleanOrNull(offer.currency_id) || null,
            ],
          );
          priceListId = plInsertRes.rows[0].id;
        } else {
          // Update existing list name or metadata if changed
          await client.query(
            `
            UPDATE price_lists SET
              name = $1,
              list_type = $2,
              party_id = $3,
              offer_method = $4,
              updated_at = NOW()
            WHERE id = $5 AND company_id = $6
            `,
            [
              offer.name || "Item Price Offer",
              offer.list_type || "SALES",
              toCleanOrNull(offer.party_id),
              offer.offer_method || "Phone",//"Fixed Price",
              priceListId,
              companyId,
            ],
          );
        }

        const pliInsertRes = await client.query(
          `
          INSERT INTO price_list_items (
            price_list_id, item_id, uom_id, standard_price, offered_price, min_order_qty, max_order_qty, has_volume_discount
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
          `,
          [
            priceListId,
            id,
            toCleanOrNull(validatedItem.base_uom_id),
            toNumberOrDefault(
              offer.standard_price,
              toNumberOrDefault(validatedItem.standard_sales_price, 0),
            ),
            toNumberOrDefault(offer.offered_price, 0),
            toNumberOrDefault(offer.min_order_qty, 1),
            toNumberOrDefault(offer.max_order_qty, 100),
            !!offer.has_volume_discount,
          ],
        );

        const priceListItemId = pliInsertRes.rows[0].id;

        if (
          offer.has_volume_discount &&
          Array.isArray(offer.volume_discounts)
        ) {
          for (const vd of offer.volume_discounts) {
            await client.query(
              `
              INSERT INTO price_list_volume_discounts (
                price_list_item_id, min_order_qty, discount_type, discount_value, discounted_price
              ) VALUES ($1, $2, $3, $4, $5)
              `,
              [
                priceListItemId,
                toNumberOrDefault(vd.min_order_qty, 1),
                vd.discount_type || "PERCENTAGE",
                toNumberOrDefault(vd.discount_value, 0),
                toNumberOrDefault(vd.discounted_price, 0),
              ],
            );
          }
        }
      } */

      // Inside your PUT route transaction execution block:
      // if (Array.isArray(rawBody.priceOffers)) {
        for (const offer of rawPriceOffers) {
          // Find or create Price List header
          let priceListId = offer.price_list_id;

          if (!priceListId) {
            const plRes = await client.query(
              `INSERT INTO price_lists (company_id, name, list_type, party_id, start_date, end_date, currency_id, offer_method, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1) RETURNING id`,
              [
                companyId,
                offer.name || "Custom Price List",
                offer.list_type || "SALES",
                offer.party_id || null,
                offer.start_date || new Date(),
                offer.end_date || new Date(Date.now() + 365 * 86400000),
                offer.currency_id || null,
                offer.offer_method || "Phone",
              ],
            );
            priceListId = plRes.rows[0].id;
          }

          // Insert or update Price List Item
          let priceListItemId = offer.price_list_item_id;
          if (!priceListItemId) {
            const pliRes = await client.query(
              `INSERT INTO price_list_items (price_list_id, item_id, uom_id, standard_price, offered_price, min_order_qty, max_order_qty, has_volume_discount)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
              [
                priceListId,
                id,
                offer.uom_id || null,
                toNumberOrDefault(offer.standard_price, 0),
                toNumberOrDefault(offer.offered_price, 0),
                toNumberOrDefault(offer.min_order_qty, 1),
                toNumberOrDefault(offer.max_order_qty, 100),
                Boolean(offer.has_volume_discount),
              ],
            );
            priceListItemId = pliRes.rows[0].id;
          } else {
            await client.query(
              `UPDATE price_list_items 
             SET offered_price = $1, min_order_qty = $2, max_order_qty = $3, has_volume_discount = $4
             WHERE id = $5`,
              [
                toNumberOrDefault(offer.offered_price, 0),
                toNumberOrDefault(offer.min_order_qty, 1),
                toNumberOrDefault(offer.max_order_qty, 100),
                Boolean(offer.has_volume_discount),
                priceListItemId,
              ],
            );
          }

          // Sync Volume Discounts
          if (Array.isArray(offer.volume_discounts)) {
            await client.query(
              `DELETE FROM price_list_volume_discounts WHERE price_list_item_id = $1`,
              [priceListItemId],
            );
            for (const tier of offer.volume_discounts) {
              await client.query(
                `INSERT INTO price_list_volume_discounts (price_list_item_id, min_order_qty, discount_type, discount_value, discounted_price)
               VALUES ($1, $2, $3, $4, $5)`,
                [
                  priceListItemId,
                  toNumberOrDefault(tier.min_order_qty, 0),
                  tier.discount_type || "PERCENTAGE",
                  toNumberOrDefault(tier.discount_value, 0),
                  toNumberOrDefault(tier.discounted_price, 0),
                ],
              );
            }
          }
        }
      // }

      await client.query("COMMIT");
      return NextResponse.json(
        { success: true, item: itemResult.rows[0] },
        { status: 200 },
      );
    } catch (err: unknown) {
      await client.query("ROLLBACK");
      console.error("PUT Item Transaction Fatal Error:", err);
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Execution Transaction Refused",
        },
        { status: 500 },
      );
    } finally {
      client.release();
    }
  } catch (parseErr: unknown) {
    return NextResponse.json(
      {
        error:
          parseErr instanceof Error
            ? parseErr.message
            : "Payload validation failure.",
      },
      { status: 400 },
    );
  }
}

/* ==========================================================
   3. DELETE ITEM
============================================================ */
export async function DELETE(_: Request, { params }: Props) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Delete associated warehouse records
    await client.query(
      `DELETE FROM item_warehouses WHERE item_id = $1 AND company_id = $2`,
      [id, companyId],
    );

    // 2. Clean up linked price list items and their volume discount tiers
    const plItemsResult = await client.query(
      `SELECT id FROM price_list_items WHERE item_id = $1`,
      [id],
    );

    if (plItemsResult.rowCount && plItemsResult.rowCount > 0) {
      const pliIds = plItemsResult.rows.map((r) => r.id);

      // Delete volume discounts for these price list items
      await client.query(
        `DELETE FROM price_list_volume_discounts WHERE price_list_item_id = ANY($1)`,
        [pliIds],
      );

      // Delete the price list items themselves
      await client.query(`DELETE FROM price_list_items WHERE item_id = $1`, [
        id,
      ]);
    }

    // 3. Soft delete the main item record
    const deleteResult = await client.query(
      `UPDATE items SET deleted_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING id`,
      [id, companyId],
    );

    if (deleteResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Record not found or user lacks authorization." },
        { status: 404 },
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      message: "Item record and its custom price offers deleted successfully.",
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    console.error("Delete operational failure:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to delete item record.",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
