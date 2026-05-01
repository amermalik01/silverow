// lib/services/inventory/item.service.ts

import { pool } from "@/lib/db";
import { QueryResult, QueryResultRow } from "pg";
import { ItemListRow } from "@/types/inventory";

type GetItemListOptions = {
  companyId: string;
  search?: string;
};

type CreateItemInput = {
  company_id: string;
  item_code?: string | null;
  barcode?: string | null;
  name: string;
  description?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  base_uom_id: string;
  purchase_uom_id?: string | null;
  sales_uom_id?: string | null;
  item_type?: number;
  status?: number;
  stock_tracking?: boolean;
  reorder_qty?: string | number | null;
  standard_sales_price?: string | number | null;

  standard_cost?: string | number | null;
  costing_method?: number;
};

type GetItemByIdOptions = {
  id: string;
  companyId: string;
};

type UpdateItemOptions = {
  id: string;
  companyId: string;
  data: Record<string, unknown>;
};

type DeleteItemOptions = {
  id: string;
  companyId: string;
};

export async function getItemList({
  companyId,
  search,
}: GetItemListOptions): Promise<ItemListRow[]> {
  const values: string[] = [companyId];

  let searchSql = "";

  if (search) {
    values.push(`%${search}%`);

    searchSql = `
      AND (
        i.item_code ILIKE $2
        OR i.name ILIKE $2
        OR i.barcode ILIKE $2
      )
    `;
  }

  const query = `
    SELECT
      i.id,
      i.item_code,
      i.barcode,
      i.name,

      c.name AS category_name,
      b.name AS brand_name,

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

    LEFT JOIN item_categories c
      ON c.id = i.category_id

    LEFT JOIN item_brands b
      ON b.id = i.brand_id

    WHERE i.company_id = $1
    AND i.deleted_at IS NULL

    ${searchSql}

    ORDER BY i.name ASC
  `;

  const result: QueryResult<ItemListRow> = await pool.query(query, values);

  return result.rows;
}

export async function createItem(
  data: CreateItemInput,
): Promise<QueryResultRow> {
  const client = await pool.connect();
  // const client: PoolClient =
  //   await pool.connect();

  try {
    await client.query("BEGIN");

    const cleanData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => {
        if (value === "") {
          return [key, null];
        }

        return [key, value];
      }),
    ) as Record<string, unknown>;

    /*
    ===================================
    AUTO ITEM CODE GENERATION
    ===================================
    */

    if (!cleanData.item_code || cleanData.item_code === null) {
      const codeResult: QueryResult<{
        code: string;
      }> = await client.query(
        `
          SELECT generate_item_code(
            $1,
            $2,
            $3
          ) AS code
        `,
        [cleanData.company_id, cleanData.category_id, cleanData.brand_id],
      );

      cleanData.item_code = codeResult.rows[0].code;
    }

    /*
    ===================================
    INSERT ITEM
    ===================================
    */

    const keys = Object.keys(cleanData);
    const values = Object.values(cleanData);

    const placeholders = keys.map((_, index) => `$${index + 1}`);

    const query = `
      INSERT INTO items
      (${keys.join(",")})

      VALUES
      (${placeholders.join(",")})

      RETURNING *
    `;

    const result = await client.query(query, values);

    await client.query("COMMIT");

    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");

    throw err;
  } finally {
    client.release();
  }
}

/* export async function createItem(
  data: CreateItemInput,
): Promise<QueryResultRow> {
  const cleanData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (value === "") {
        return [key, null];
      }

      return [key, value];
    }),
  );

  const keys = Object.keys(cleanData);

  const values = Object.values(cleanData);

  const placeholders = keys.map((_, index) => `$${index + 1}`);

  const query = `
    INSERT INTO items
    (${keys.join(",")})

    VALUES
    (${placeholders.join(",")})

    RETURNING *
  `;

  const result = await pool.query(query, values);

  return result.rows[0];
} */

export async function getItemById({ id, companyId }: GetItemByIdOptions) {
  const query = `
    SELECT *
    FROM items
    WHERE id = $1
    AND company_id = $2
    AND deleted_at IS NULL
  `;

  const result = await pool.query(query, [id, companyId]);

  return result.rows[0];
}

export async function updateItem({ id, companyId, data }: UpdateItemOptions) {
  const cleanData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (value === "") {
        return [key, null];
      }

      return [key, value];
    }),
  );

  const keys = Object.keys(cleanData);

  const values = Object.values(cleanData);

  const setClause = keys.map((key, index) => `${key} = $${index + 1}`);

  const query = `
    UPDATE items
    SET
      ${setClause.join(",")},
      updated_at = NOW()

    WHERE id = $${keys.length + 1}

    AND company_id = $${keys.length + 2}

    RETURNING *
  `;

  const result = await pool.query(query, [...values, id, companyId]);

  return result.rows[0];
}

export async function deleteItem({ id, companyId }: DeleteItemOptions) {
  const query = `
    UPDATE items
    SET deleted_at = NOW()

    WHERE id = $1
    AND company_id = $2

    RETURNING id
  `;

  const result = await pool.query(query, [id, companyId]);

  return result.rows[0];
}
