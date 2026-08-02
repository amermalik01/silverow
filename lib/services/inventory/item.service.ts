// lib/services/inventory/item.service.ts

import { pool } from "@/lib/db";
import { QueryResult, QueryResultRow } from "pg";
import { ItemListRow, ItemWarehouseDraft } from "@/types/inventory";

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
  warehouses?: ItemWarehouseDraft[];
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
    LEFT JOIN item_categories c ON c.id = i.category_id
    LEFT JOIN item_brands b ON b.id = i.brand_id

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

  try {
    await client.query("BEGIN");

    const { warehouses, ...itemData } = data;

    const cleanData = Object.fromEntries(
      Object.entries(data).map(([key, value]) => {
        if (value === "") {
          return [key, null];
        }

        return [key, value];
      }),
    ) as Record<string, unknown>;

    if (!cleanData.item_code || cleanData.item_code === null) {
      const codeResult = await client.query<{ code: string }>(
        `SELECT generate_item_code($1, $2, $3) AS code`,
        [cleanData.company_id, cleanData.category_id, cleanData.brand_id],
      );
      cleanData.item_code = codeResult.rows[0].code;
    }

    // if (!cleanData.item_code || cleanData.item_code === null) {
    //   const codeResult: QueryResult<{
    //     code: string;
    //   }> = await client.query(
    //     `
    //       SELECT generate_item_code(
    //         $1,
    //         $2,
    //         $3
    //       ) AS code
    //     `,
    //     [cleanData.company_id, cleanData.category_id, cleanData.brand_id],
    //   );
    //   cleanData.item_code = codeResult.rows[0].code;
    // }

    const keys = Object.keys(cleanData);
    const values = Object.values(cleanData);
    const placeholders = keys.map((_, index) => `$${index + 1}`);

    const itemQuery = ` 
      INSERT INTO items (${keys.join(",")})
      VALUES (${placeholders.join(",")})
      RETURNING *
    `;

    // const result = await client.query(query, values);
    const itemResult = await client.query(itemQuery, values);
    const newItem = itemResult.rows[0];

    if (Array.isArray(warehouses) && warehouses.length > 0) {
      for (const wrh of warehouses) {
        if (!wrh.warehouse_id) continue;

        await client.query(
          `
          INSERT INTO item_warehouses (
            company_id,
            item_id,
            warehouse_id,
            storage_location_id,
            unit_of_measure,
            cost_frequency,
            currency,
            cost,
            is_default,
            status,
            start_date,
            comments
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `,
          [
            cleanData.company_id,
            newItem.id,
            wrh.warehouse_id,
            wrh.storage_location_id || null,
            wrh.unit_of_measure || null,
            wrh.cost_frequency || null,
            wrh.currency || null,
            wrh.cost ? Number(wrh.cost) : 0,
            wrh.is_default ?? false,
            wrh.status ?? 1,
            wrh.start_date || null,
            wrh.comments || null,
          ],
        );
      }
    }

    await client.query("COMMIT");
    return newItem;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getItemById({ id, companyId }: GetItemByIdOptions) {
  // 1. Fetch Item base profile
  const itemResult = await pool.query(
    `
    SELECT *
    FROM items
    WHERE id = $1
    AND company_id = $2
    AND deleted_at IS NULL
    `,
    [id, companyId],
  );

  if (itemResult.rows.length === 0) {
    return null;
  }

  const item = itemResult.rows[0];

  // 2. Fetch linked warehouse records from `item_warehouses`
  const warehouseResult = await pool.query(
    `
    SELECT 
      id,
      warehouse_id,
      storage_location_id,
      unit_of_measure,
      cost_frequency,
      currency,
      cost,
      is_default,
      status,
      to_char(start_date, 'YYYY-MM-DD') AS start_date,
      comments
    FROM item_warehouses
    WHERE item_id = $1 AND company_id = $2
    ORDER BY is_default DESC, created_at ASC
    `,
    [id, companyId],
  );

  return {
    ...item,
    warehouses: warehouseResult.rows,
  };
}

export async function updateItem({ id, companyId, data }: UpdateItemOptions) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Extract warehouses array out of the main update payload
    // const { warehouses, ...itemData } = data;
    const { warehouses, id: _, company_id: __, created_at: ___, updated_at: ____, ...itemData } = data;

    const cleanData = Object.fromEntries(
      Object.entries(itemData).map(([key, value]) => {
        if (value === "") return [key, null];
        return [key, value];
      }),
    );

    const keys = Object.keys(cleanData);
    const values = Object.values(cleanData);

    let updatedItem = null;

    if (keys.length > 0) {
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

      const result = await client.query(query, [...values, id, companyId]);
      updatedItem = result.rows[0];
    } else {
      const result = await client.query(
        `SELECT * FROM items WHERE id = $1 AND company_id = $2`,
        [id, companyId],
      );
      updatedItem = result.rows[0];
    }

    // Sync `item_warehouses` records (Upsert strategy via full replace inside transaction)
    if (Array.isArray(warehouses)) {
      // Clear existing assignments for this item
      await client.query(
        `DELETE FROM item_warehouses WHERE item_id = $1 AND company_id = $2`,
        [id, companyId],
      );

      // Insert active list
      for (const wrh of warehouses) {
        if (!wrh.warehouse_id) continue;

        await client.query(
          `
          INSERT INTO item_warehouses (
            company_id,
            item_id,
            warehouse_id,
            storage_location_id,
            unit_of_measure,
            cost_frequency,
            currency,
            cost,
            is_default,
            status,
            start_date,
            comments
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          `,
          [
            companyId,
            id,
            wrh.warehouse_id,
            wrh.storage_location_id || null,
            wrh.unit_of_measure || null,
            wrh.cost_frequency || null,
            wrh.currency || null,
            wrh.cost ? Number(wrh.cost) : 0,
            wrh.is_default ?? false,
            wrh.status ?? 1,
            wrh.start_date || null,
            wrh.comments || null,
          ],
        );
      }
    }

    await client.query("COMMIT");

    // Retrieve full updated record including synced warehouses
    return await getItemById({ id, companyId });
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
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

/* export async function updateItem({ id, companyId, data }: UpdateItemOptions) {
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
} */
