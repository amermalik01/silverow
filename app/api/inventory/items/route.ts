// app/api/inventory/items/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { ItemSchema, ItemWarehouseSchema } from "@/lib/validations/item.schema";
import { z } from "zod";

type ItemWarehouseInput = z.infer<typeof ItemWarehouseSchema>;

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
   1. GET ITEMS LIST (GET /api/inventory/items)
============================================================ */
export async function GET(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { error: "Access Denied. Unauthorized Session Check." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() || "";

  const whereClauses: string[] = ["i.company_id = $1", "i.deleted_at IS NULL"];
  const values: (string | number)[] = [companyId];

  if (search) {
    whereClauses.push(`(
      i.item_code ILIKE $2 OR 
      i.name ILIKE $2 OR 
      i.barcode ILIKE $2
    )`);
    values.push(`%${search}%`);
  }

  const query = `
    SELECT
      i.id,
      i.item_code,
      i.barcode,
      i.name,
      c.name AS category_name,
      b.name AS brand_name,
      i.inventory_posting_group_id,
      ipg.name AS posting_group_name,
      i.item_type,
      CASE i.item_type
        WHEN 1 THEN 'Inventory'
        WHEN 2 THEN 'Service'
        WHEN 3 THEN 'Non Inventory'
        WHEN 4 THEN 'Raw Material'
        WHEN 5 THEN 'Finished Goods'
        WHEN 6 THEN 'Asset'
      END AS item_type_label,
      i.status,
      CASE i.status
        WHEN 1 THEN 'Active'
        WHEN 2 THEN 'Inactive'
        WHEN 3 THEN 'Discontinued'
      END AS status_label
    FROM items i
    LEFT JOIN item_categories c ON c.id = i.category_id
    LEFT JOIN item_brands b ON b.id = i.brand_id
    LEFT JOIN inventory_posting_groups ipg ON ipg.id = i.inventory_posting_group_id
    WHERE ${whereClauses.join(" AND ")}
    ORDER BY i.name ASC
  `;

  const client = await pool.connect();
  try {
    const result = await client.query(query, values);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Fetch Items Error: ", err);
    return NextResponse.json(
      { error: "Internal error fetching inventory items." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* ==========================================================
   2. CREATE ITEM (POST /api/inventory/items)
============================================================ */
export async function POST(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { error: "Unauthorized operation sequence blocked." },
      { status: 401 },
    );
  }

  try {
    const rawBody = await req.json();
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Fetch Company Default Posting Group (used if missing in payload/migration)
      const defaultGroupRes = await client.query(
        `SELECT id FROM inventory_posting_groups WHERE company_id = $1 ORDER BY id ASC LIMIT 1`,
        [companyId],
      );
      const companyDefaultPostingGroupId = defaultGroupRes.rows[0]?.id || null;

      // Handle both Single Item Creation and Bulk Migration Payloads
      const isBatchMigration = Array.isArray(rawBody.items);
      const itemsToProcess = isBatchMigration
        ? rawBody.items
        : [rawBody.item || rawBody];

      const insertedItems = [];

      for (const rawItemData of itemsToProcess) {
        const validatedItem = ItemSchema.parse(rawItemData);

        const rawWarehouses = Array.isArray(rawItemData.warehouses)
          ? rawItemData.warehouses
          : Array.isArray(rawBody.warehouses)
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

        let item_code = validatedItem.item_code || null;

        // Auto-generate code if not supplied in single-item creation or migration
        if (!item_code) {
          const codeResult = await client.query(
            `SELECT generate_item_code($1, $2, $3) AS code`,
            [
              companyId,
              validatedItem.category_id || null,
              validatedItem.brand_id || null,
            ],
          );
          item_code = codeResult.rows[0]?.code || null;
        }

        // Use supplied posting group or fall back to company default
        const postingGroupId =
          toCleanOrNull(validatedItem.inventory_posting_group_id) ||
          companyDefaultPostingGroupId;

        const itemInsertQuery = `
          INSERT INTO items (
            company_id, item_code, barcode, name, description,
            category_id, brand_id, base_uom_id, purchase_uom_id, sales_uom_id,
            item_type, status, stock_tracking, reorder_qty, standard_sales_price,
            standard_cost, costing_method, inventory_posting_group_id,
            inventory_gl_id, cogs_gl_id, sales_gl_id, purchase_gl_id,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18,
            $19, $20, $21, $22, NOW(), NOW()
          ) RETURNING *;
        `;

        const itemValues = [
          companyId,
          item_code,
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
          toNumberOrDefault(validatedItem.costing_method, 1),
          postingGroupId,
          toCleanOrNull(validatedItem.inventory_gl_id),
          toCleanOrNull(validatedItem.cogs_gl_id),
          toCleanOrNull(validatedItem.sales_gl_id),
          toCleanOrNull(validatedItem.purchase_gl_id),
        ];

        const itemResult = await client.query(itemInsertQuery, itemValues);
        const newItem = itemResult.rows[0];

        // Process Warehouse assignments
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
                newItem.id,
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

        insertedItems.push(newItem);
      }

      await client.query("COMMIT");

      if (isBatchMigration) {
        return NextResponse.json(
          {
            success: true,
            message: `Successfully migrated ${insertedItems.length} items.`,
            count: insertedItems.length,
          },
          { status: 201 },
        );
      }

      return NextResponse.json(
        { success: true, id: insertedItems[0].id, item: insertedItems[0] },
        { status: 201 },
      );
    } catch (txErr) {
      await client.query("ROLLBACK");
      console.error("Transaction failure trace: ", txErr);
      return NextResponse.json(
        {
          error:
            txErr instanceof Error
              ? txErr.message
              : "Database engine failure executing persistence profiles.",
        },
        { status: 400 },
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

/* import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { createItem, getItemList } from "@/lib/services/inventory/item.service";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json(
      {
        error: "Company context missing",
      },
      { status: 400 },
    );
  }

  const search = req.nextUrl.searchParams.get("search") || "";

  const data = await getItemList({
    companyId,
    search,
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json(
      {
        error: "Company context missing",
      },
      { status: 400 },
    );
  }

  const body = await req.json();

  const data = await createItem({
    ...body,
    company_id: companyId,
  });

  return NextResponse.json(data);
} */
