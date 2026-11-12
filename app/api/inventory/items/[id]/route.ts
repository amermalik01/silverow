// app/api/inventory/items/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ItemSchema, ItemWarehouseSchema } from "@/lib/validations/item.schema";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

import type { PriceListSnapshot } from "@/lib/services/inventory/price-list-history.service";

import { PriceListHistoryService } from "@/lib/services/inventory/price-list-history.service";

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

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user.id;

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
          net_weight = $14,
          gross_weight = $15,
          height = $16,
          width = $17,
          length = $18,

          minimum_sales_price = $19,
          standard_sales_price = $20,
          standard_purchase_price = $21,
          standard_cost = $22,
          costing_method = $23,
          inventory_posting_group_id = $24,
          inventory_gl_id = $25,
          cogs_gl_id = $26,
          sales_gl_id = $27,
          purchase_gl_id = $28,
          vat_product_group_id = $29,
          updated_at = NOW()
        WHERE id = $30 AND company_id = $31
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

        toNumberOrDefault(validatedItem.net_weight, 0),
        toNumberOrDefault(validatedItem.gross_weight, 0),

        toNumberOrDefault(validatedItem.height, 0),
        toNumberOrDefault(validatedItem.width, 0),
        toNumberOrDefault(validatedItem.length, 0),

        toNumberOrDefault(validatedItem.minimum_sales_price, 0),
        toNumberOrDefault(validatedItem.standard_sales_price, 0),

        toNumberOrDefault(validatedItem.standard_purchase_price, 0),
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

      // ==========================================================
      // PRICE LIST HISTORY + PRICE OFFER SYNCHRONIZATION
      // ==========================================================

      const existingPlItemsRes = await client.query(
        `
          SELECT
            pli.id AS price_list_item_id,
            pl.id AS price_list_id,
            pl.party_id,
            pl.list_type
          FROM price_list_items pli
          INNER JOIN price_lists pl
            ON pl.id = pli.price_list_id
          WHERE pli.item_id = $1
            AND pl.company_id = $2
        `,
        [id, companyId],
      );

      const existingItemsMap = new Map<
        string,
        {
          priceListItemId: string;
          priceListId: string;
        }
      >();

      for (const row of existingPlItemsRes.rows) {
        const key = `${row.list_type}_${row.party_id || "GLOBAL"}`;

        existingItemsMap.set(key, {
          priceListItemId: row.price_list_item_id,
          priceListId: row.price_list_id,
        });
      }

      const incomingKeys = new Set<string>();

      for (const offer of rawPriceOffers) {
        const offerStartDate =
          toDateOrNull(offer.start_date) || `${new Date().getFullYear()}-01-01`;

        const offerEndDate =
          toDateOrNull(offer.end_date) || `${new Date().getFullYear()}-12-31`;

        const listType = offer.list_type || "SALES";
        const partyId = toCleanOrNull(offer.party_id);

        const mapKey = `${listType}_${partyId || "GLOBAL"}`;

        incomingKeys.add(mapKey);

        // Resolve existing IDs before changing anything.
        let priceListId: string | null =
          toCleanOrNull(offer.price_list_id) ||
          existingItemsMap.get(mapKey)?.priceListId ||
          null;

        let priceListItemId: string | null =
          toCleanOrNull(offer.price_list_item_id) ||
          existingItemsMap.get(mapKey)?.priceListItemId ||
          null;

        // Validate an explicitly supplied price list belongs to this company.
        if (priceListId) {
          const listCheck = await client.query(
            `
              SELECT id
              FROM price_lists
              WHERE id = $1
                AND company_id = $2
            `,
            [priceListId, companyId],
          );

          if (!listCheck.rows[0]) {
            throw new Error("Invalid price list or unauthorized access.");
          }
        }

        // Validate the item row belongs to this list and this item.
        if (priceListItemId && priceListId) {
          const itemCheck = await client.query(
            `
              SELECT pli.id
              FROM price_list_items pli
              INNER JOIN price_lists pl
                ON pl.id = pli.price_list_id
              WHERE pli.id = $1
                AND pli.price_list_id = $2
                AND pli.item_id = $3
                AND pl.company_id = $4
            `,
            [priceListItemId, priceListId, id, companyId],
          );

          if (!itemCheck.rows[0]) {
            throw new Error(
              "Price list item does not belong to this item or company.",
            );
          }
        }

        // IMPORTANT:
        // Capture the complete OLD snapshot before updating the header,
        // price list item, or volume discount rows.
        let oldSnapshot: PriceListSnapshot | null = null;

        if (priceListId && priceListItemId) {
          oldSnapshot = await PriceListHistoryService.getSnapshot(client, {
            companyId,
            priceListId,
            priceListItemId,
            itemId: id,
          });
        }

        const overlapCheckQuery = `
          SELECT pl.id
          FROM price_lists pl
          INNER JOIN price_list_items pli
            ON pli.price_list_id = pl.id
          WHERE pli.item_id = $1
            AND pl.company_id = $2
            AND pl.list_type = $3
            AND pl.party_id IS NOT DISTINCT FROM $4
            AND ($5::date <= pl.end_date AND $6::date >= pl.start_date)
            ${priceListId ? "AND pl.id <> $7" : ""}
        `;

        const overlapParams = priceListId
          ? [
              id,
              companyId,
              listType,
              partyId,
              offerStartDate,
              offerEndDate,
              priceListId,
            ]
          : [id, companyId, listType, partyId, offerStartDate, offerEndDate];

        const overlapResult = await client.query(
          overlapCheckQuery,
          overlapParams,
        );

        if (overlapResult.rowCount && overlapResult.rowCount > 0) {
          throw new Error(
            `Price offer date range (${offerStartDate} to ${offerEndDate}) overlaps with an existing price offer for this ${offer.party_type || "party"}.`,
          );
        }

        const defaultOfferName = `${validatedItem.name} - ${
          listType === "SALES" ? "Customer Offer" : "Supplier Offer"
        }`;

        // ----------------------------------------------------------
        // 1. PRICE LIST HEADER
        // ----------------------------------------------------------

        if (!priceListId) {
          const plInsertRes = await client.query(
            `
              INSERT INTO price_lists (
                company_id,
                name,
                list_type,
                party_id,
                offer_method,
                start_date,
                end_date,
                currency_id,
                status
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
              RETURNING id
            `,
            [
              companyId,
              offer.name || defaultOfferName,
              listType,
              partyId,
              offer.offer_method || "Phone",
              offerStartDate,
              offerEndDate,
              toCleanOrNull(offer.currency_id) ||
                toCleanOrNull(validatedItem.sales_uom_id) ||
                companyId,
            ],
          );

          priceListId = plInsertRes.rows[0].id;
        } else {
          await client.query(
            `
              UPDATE price_lists
              SET
                name = $1,
                list_type = $2,
                party_id = $3,
                offer_method = $4,
                start_date = $5,
                end_date = $6,
                currency_id = $7,
                updated_by = $8,
                updated_at = NOW()
              WHERE id = $9
                AND company_id = $10
            `,
            [
              offer.name || defaultOfferName,
              listType,
              partyId,
              offer.offer_method || "Phone",
              offerStartDate,
              offerEndDate,
              toCleanOrNull(offer.currency_id) ||
                toCleanOrNull(validatedItem.sales_uom_id) ||
                companyId,
              currentUserId || null,
              priceListId,
              companyId,
            ],
          );
        }

        const newOfferedPrice = toNumberOrDefault(offer.offered_price, 0);

        const newMinQty = toNumberOrDefault(offer.min_order_qty, 1);

        const newMaxQty = toNumberOrDefault(offer.max_order_qty, 100);

        const standardPriceVal = toNumberOrDefault(
          offer.standard_price,
          toNumberOrDefault(validatedItem.standard_sales_price, 0),
        );

        // ----------------------------------------------------------
        // 2. PRICE LIST ITEM
        // ----------------------------------------------------------

        if (!priceListItemId) {
          const pliRes = await client.query(
            `
              INSERT INTO price_list_items (
                price_list_id,
                item_id,
                uom_id,
                standard_price,
                offered_price,
                min_order_qty,
                max_order_qty,
                has_volume_discount
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
              RETURNING id
            `,
            [
              priceListId,
              id,
              toCleanOrNull(validatedItem.base_uom_id),
              standardPriceVal,
              newOfferedPrice,
              newMinQty,
              newMaxQty,
              Boolean(offer.has_volume_discount),
            ],
          );

          priceListItemId = pliRes.rows[0].id;

          // Preserve the existing basic history behavior.
          await client.query(
            `
              INSERT INTO price_list_item_history (
                price_list_item_id,
                new_offered_price,
                new_min_order_qty,
                new_max_order_qty,
                changed_by
              )
              VALUES ($1, $2, $3, $4, $5)
            `,
            [
              priceListItemId,
              newOfferedPrice,
              newMinQty,
              newMaxQty,
              currentUserId || null,
            ],
          );
        } else {
          // Preserve the existing basic history behavior.
          const existingPliRes = await client.query(
            `
              SELECT
                offered_price,
                min_order_qty,
                max_order_qty
              FROM price_list_items
              WHERE id = $1
                AND price_list_id = $2
                AND item_id = $3
            `,
            [priceListItemId, priceListId, id],
          );

          if (existingPliRes.rows[0]) {
            const oldRow = existingPliRes.rows[0];

            if (
              Number(oldRow.offered_price) !== newOfferedPrice ||
              Number(oldRow.min_order_qty) !== newMinQty ||
              Number(oldRow.max_order_qty) !== newMaxQty
            ) {
              await client.query(
                `
                  INSERT INTO price_list_item_history (
                    price_list_item_id,
                    old_offered_price,
                    new_offered_price,
                    old_min_order_qty,
                    new_min_order_qty,
                    old_max_order_qty,
                    new_max_order_qty,
                    changed_by
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `,
                [
                  priceListItemId,
                  oldRow.offered_price,
                  newOfferedPrice,
                  oldRow.min_order_qty,
                  newMinQty,
                  oldRow.max_order_qty,
                  newMaxQty,
                  currentUserId || null,
                ],
              );
            }
          }

          await client.query(
            `
              UPDATE price_list_items
              SET
                standard_price = $1,
                offered_price = $2,
                min_order_qty = $3,
                max_order_qty = $4,
                has_volume_discount = $5,
                updated_at = NOW()
              WHERE id = $6
                AND price_list_id = $7
            `,
            [
              standardPriceVal,
              newOfferedPrice,
              newMinQty,
              newMaxQty,
              Boolean(offer.has_volume_discount),
              priceListItemId,
              priceListId,
            ],
          );
        }

        // ----------------------------------------------------------
        // 3. VOLUME DISCOUNT TIERS
        // ----------------------------------------------------------

        // Delete old tiers only AFTER the old snapshot has been captured.
        await client.query(
          `
            DELETE FROM price_list_volume_discounts
            WHERE price_list_item_id = $1
          `,
          [priceListItemId],
        );

        if (
          offer.has_volume_discount &&
          Array.isArray(offer.volume_discounts)
        ) {
          for (const vd of offer.volume_discounts) {
            await client.query(
              `
                INSERT INTO price_list_volume_discounts (
                  price_list_item_id,
                  min_order_qty,
                  discount_type,
                  discount_value,
                  discounted_price
                )
                VALUES ($1, $2, $3, $4, $5)
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

        // ----------------------------------------------------------
        // 4. CAPTURE NEW SNAPSHOT AND RECORD THE AUDIT EVENT
        // ----------------------------------------------------------

        const newSnapshot = await PriceListHistoryService.getSnapshot(client, {
          companyId,
          priceListId,
          priceListItemId,
          itemId: id,
        });

        await PriceListHistoryService.record(client, {
          companyId,
          itemId: id,
          priceListId,
          priceListItemId,
          action: oldSnapshot ? "UPDATE" : "CREATE",
          oldSnapshot,
          newSnapshot,
          changedBy: currentUserId || null,
        });
      }

      // ----------------------------------------------------------
      // 5. CLEAN UP OFFERS REMOVED FROM THE UI
      // ----------------------------------------------------------

      for (const [mapKey, data] of existingItemsMap.entries()) {
        if (incomingKeys.has(mapKey)) {
          continue;
        }

        const oldSnapshot = await PriceListHistoryService.getSnapshot(client, {
          companyId,
          priceListId: data.priceListId,
          priceListItemId: data.priceListItemId,
          itemId: id,
        });

        if (oldSnapshot) {
          await PriceListHistoryService.record(client, {
            companyId,
            itemId: id,
            priceListId: data.priceListId,
            priceListItemId: data.priceListItemId,
            action: "DELETE",
            oldSnapshot,
            newSnapshot: null,
            changedBy: currentUserId || null,
          });
        }

        // Delete only this item's price-list row.
        // Do not delete the entire price-list header: it may contain
        // other items belonging to the same price list.
        await client.query(
          `
            DELETE FROM price_list_items
            WHERE id = $1
              AND item_id = $2
              AND price_list_id = $3
          `,
          [data.priceListItemId, id, data.priceListId],
        );

        // Remove the header only when no other items use it.
        await client.query(
          `
            DELETE FROM price_lists pl
            WHERE pl.id = $1
              AND pl.company_id = $2
              AND NOT EXISTS (
                SELECT 1
                FROM price_list_items pli
                WHERE pli.price_list_id = pl.id
              )
          `,
          [data.priceListId, companyId],
        );
      }

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

  const session = await getServerSession(authOptions);
  const currentUserId = session?.user.id || null;

  const { id } = await params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Delete associated warehouse records
    await client.query(
      `DELETE FROM item_warehouses WHERE item_id = $1 AND company_id = $2`,
      [id, companyId],
    );

    // ==========================================================
    // 2. CAPTURE PRICE LIST HISTORY BEFORE DELETING OFFERS
    // ==========================================================

    const plItemsResult = await client.query<{
      price_list_item_id: string;
      price_list_id: string;
    }>(
      `
        SELECT
          pli.id AS price_list_item_id,
          pli.price_list_id
        FROM price_list_items pli
        INNER JOIN price_lists pl
          ON pl.id = pli.price_list_id
        WHERE pli.item_id = $1
          AND pl.company_id = $2
      `,
      [id, companyId],
    );

    for (const row of plItemsResult.rows) {
      const oldSnapshot = await PriceListHistoryService.getSnapshot(client, {
        companyId,
        itemId: id,
        priceListId: row.price_list_id,
        priceListItemId: row.price_list_item_id,
      });

      if (!oldSnapshot) {
        continue;
      }

      await PriceListHistoryService.record(client, {
        companyId,
        itemId: id,
        priceListId: row.price_list_id,
        priceListItemId: row.price_list_item_id,
        action: "DELETE",
        oldSnapshot,
        newSnapshot: null,
        changedBy: currentUserId,
      });
    }

    // ==========================================================
    // 3. DELETE ONLY THIS ITEM'S PRICE LIST ITEMS
    // ==========================================================

    // Volume discount rows should be removed through the
    // price_list_item_id ON DELETE CASCADE relationship.

    await client.query(
      `
        DELETE FROM price_list_items pli
        USING price_lists pl
        WHERE pli.price_list_id = pl.id
          AND pli.item_id = $1
          AND pl.company_id = $2
      `,
      [id, companyId],
    );

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
// Map existing active price list items for this item to preserve IDs and track history properly
/* const existingPlItemsRes = await client.query(
        `
        SELECT pli.id AS price_list_item_id, pl.id AS price_list_id, pl.party_id, pl.list_type 
        FROM price_list_items pli
        JOIN price_lists pl ON pli.price_list_id = pl.id
        WHERE pli.item_id = $1 AND pl.company_id = $2
        `,
        [id, companyId],
      );

      const existingItemsMap = new Map<
        string,
        { priceListItemId: string; priceListId: string }
      >();

      for (const row of existingPlItemsRes.rows) {
        const key = `${row.list_type}_${row.party_id || "GLOBAL"}`;
        existingItemsMap.set(key, {
          priceListItemId: row.price_list_item_id,
          priceListId: row.price_list_id,
        });
      }

      // Collect incoming price offer keys to clear out stale removed records later
      const incomingKeys = new Set<string>();

      // Re-insert/Sync submitted price offers with Date Overlap Validation & History Tracking
      for (const offer of rawPriceOffers) {
        const offerStartDate =
          toDateOrNull(offer.start_date) || `${new Date().getFullYear()}-01-01`;
        const offerEndDate =
          toDateOrNull(offer.end_date) || `${new Date().getFullYear()}-12-31`;
        const listType = offer.list_type || "SALES";
        const partyId = toCleanOrNull(offer.party_id);
        const mapKey = `${listType}_${partyId || "GLOBAL"}`;
        incomingKeys.add(mapKey);

        // Resolve priceListId early so we can exclude it from self-overlap checks
        let priceListId =
          offer.price_list_id || existingItemsMap.get(mapKey)?.priceListId;

        // Check for date overlaps on the same item and same party/list_type combination
        const overlapCheckQuery = `
          SELECT pl.id FROM price_lists pl
          JOIN price_list_items pli ON pli.price_list_id = pl.id
          WHERE pli.item_id = $1 
            AND pl.company_id = $2 
            AND pl.list_type = $3
            AND (pl.party_id IS NOT DISTINCT FROM $4)
            AND ($5::date <= pl.end_date AND $6::date >= pl.start_date)            
            ${priceListId ? "AND pl.id <> $7" : ""}
        `;
        // ${offer.price_list_id ? "AND pl.id <> $7" : ""}

        const overlapParams = priceListId //offer.price_list_id
          ? [
              id,
              companyId,
              listType,
              partyId,
              offerStartDate,
              offerEndDate,
              // offer.price_list_id,
              priceListId,
            ]
          : [id, companyId, listType, partyId, offerStartDate, offerEndDate];

        const overlapResult = await client.query(
          overlapCheckQuery,
          overlapParams,
        );

        if (overlapResult.rowCount && overlapResult.rowCount > 0) {
          await client.query("ROLLBACK");
          return NextResponse.json(
            {
              error: `Price offer date range (${offerStartDate} to ${offerEndDate}) overlaps with an existing price offer for this ${offer.party_type || "party"}.`,
            },
            { status: 400 },
          );
        }

        // let priceListId =
        //   offer.price_list_id || existingItemsMap.get(mapKey)?.priceListId;
        const defaultOfferName = `${validatedItem.name} - ${listType === "SALES" ? "Customer Offer" : "Supplier Offer"}`;

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
              offer.name || defaultOfferName,
              listType,
              partyId,
              offer.offer_method || "Phone",
              offerStartDate,
              offerEndDate,
              toCleanOrNull(offer.currency_id) ||
                toCleanOrNull(validatedItem.sales_uom_id) ||
                companyId,
            ],
          );
          priceListId = plInsertRes.rows[0].id;
        } else {
          await client.query(
            `
            UPDATE price_lists SET
              name = $1,
              list_type = $2,
              party_id = $3,
              offer_method = $4,
              start_date = $5,
              end_date = $6,
              currency_id = $7,
              updated_at = NOW()
            WHERE id = $8 AND company_id = $9
            `,
            [
              offer.name || defaultOfferName,
              listType,
              partyId,
              offer.offer_method || "Phone",
              offerStartDate,
              offerEndDate,
              toCleanOrNull(offer.currency_id) ||
                toCleanOrNull(validatedItem.sales_uom_id) ||
                companyId,
              priceListId,
              companyId,
            ],
          );
        }

        let priceListItemId =
          offer.price_list_item_id ||
          existingItemsMap.get(mapKey)?.priceListItemId;

        let oldSnapshot: PriceListSnapshot | null = null;

        if (priceListId && offer.price_list_item_id) {
          oldSnapshot = await PriceListHistoryService.getSnapshot(client, {
            companyId,
            priceListId,
            priceListItemId: offer.price_list_item_id,
          });
        }

        const newOfferedPrice = toNumberOrDefault(offer.offered_price, 0);
        const newMinQty = toNumberOrDefault(offer.min_order_qty, 1);
        const newMaxQty = toNumberOrDefault(offer.max_order_qty, 100);
        const standardPriceVal = toNumberOrDefault(
          offer.standard_price,
          toNumberOrDefault(validatedItem.standard_sales_price, 0),
        );

        if (!priceListItemId) {
          const pliRes = await client.query(
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
              standardPriceVal,
              newOfferedPrice,
              newMinQty,
              newMaxQty,
              Boolean(offer.has_volume_discount),
            ],
          );
          priceListItemId = pliRes.rows[0].id;

          // Initial creation history log
          await client.query(
            `
            INSERT INTO price_list_item_history (
              price_list_item_id, new_offered_price, new_min_order_qty, new_max_order_qty, changed_by
            ) VALUES ($1, $2, $3, $4, $5)
            `,
            [
              priceListItemId,
              newOfferedPrice,
              newMinQty,
              newMaxQty,
              currentUserId,
            ],
          );
        } else {
          // Check for modifications to record audit history
          const existingPliRes = await client.query(
            `SELECT offered_price, min_order_qty, max_order_qty FROM price_list_items WHERE id = $1`,
            [priceListItemId],
          );

          if (existingPliRes.rowCount && existingPliRes.rowCount > 0) {
            const oldRow = existingPliRes.rows[0];
            if (
              Number(oldRow.offered_price) !== newOfferedPrice ||
              Number(oldRow.min_order_qty) !== newMinQty ||
              Number(oldRow.max_order_qty) !== newMaxQty
            ) {
              await client.query(
                `
                INSERT INTO price_list_item_history (
                  price_list_item_id, old_offered_price, new_offered_price, old_min_order_qty, new_min_order_qty, old_max_order_qty, new_max_order_qty, changed_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `,
                [
                  priceListItemId,
                  oldRow.offered_price,
                  newOfferedPrice,
                  oldRow.min_order_qty,
                  newMinQty,
                  oldRow.max_order_qty,
                  newMaxQty,
                  currentUserId,
                ],
              );
            }
          }

          await client.query(
            `
            UPDATE price_list_items SET
              standard_price = $1,
              offered_price = $2,
              min_order_qty = $3,
              max_order_qty = $4,
              has_volume_discount = $5,
              updated_at = NOW()
            WHERE id = $6
            `,
            [
              standardPriceVal,
              newOfferedPrice,
              newMinQty,
              newMaxQty,
              Boolean(offer.has_volume_discount),
              priceListItemId,
            ],
          );
        }

        // Sync Volume Discount Tiers
        await client.query(
          `DELETE FROM price_list_volume_discounts WHERE price_list_item_id = $1`,
          [priceListItemId],
        );

        const newSnapshot = await PriceListHistoryService.getSnapshot(client, {
          companyId,
          priceListId,
          priceListItemId,
        });

        await PriceListHistoryService.record(client, {
          companyId,
          itemId: id,
          priceListId,
          priceListItemId,
          action: oldSnapshot ? "UPDATE" : "CREATE",
          oldSnapshot,
          newSnapshot,
          changedBy: currentUserId || null,
        });

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

// Cleanup any price offers that were removed from the UI
// for (const [mapKey, data] of existingItemsMap.entries()) {
//   if (!incomingKeys.has(mapKey)) {
//     await client.query(
//       `DELETE FROM price_lists WHERE id = $1 AND company_id = $2`,
//       [data.priceListId, companyId],
//     );
//   }
// }
