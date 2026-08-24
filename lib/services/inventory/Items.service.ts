// lib/services/inventory/Items.service.ts

import { pool } from "@/lib/db";
import { FetchParams, FetchResponse } from "@/types/table";
import { ItemListRow } from "@/types/inventory";

export type ItemListing = ItemListRow & {
  posting_group_name?: string | null;
};

export class ItemsService {
  static async listPaginated(
    companyId: string,
    params: FetchParams,
  ): Promise<FetchResponse<ItemListing>> {
    const {
      page = 1,
      pageSize = 20,
      filters = {},
      sortBy,
      sortOrder = "asc",
    } = params;
    const offset = (page - 1) * pageSize;

    const SORT_FIELDS: Record<string, string> = {
      item_code: "i.item_code",
      barcode: "i.barcode",
      name: "i.name",
      category_name: "c.name",
      brand_name: "b.name",
      posting_group_name: "ipg.name",
      item_type_label: "i.item_type",
      status_label: "i.status",
    };

    const orderByColumn =
      sortBy && SORT_FIELDS[sortBy] ? SORT_FIELDS[sortBy] : "i.name";
    const orderDirection = sortOrder?.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const queryValues: (string | number)[] = [companyId];
    const whereClauses = ["i.company_id = $1", "i.deleted_at IS NULL"];

    // Dynamic Filters
    Object.entries(filters).forEach(([colKey, filter]) => {
      if (!filter) return;

      if (filter.value !== undefined && filter.value !== "") {
        if (colKey === "item_code") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`i.item_code ILIKE $${queryValues.length}`);
        } else if (colKey === "barcode") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`i.barcode ILIKE $${queryValues.length}`);
        } else if (colKey === "name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`i.name ILIKE $${queryValues.length}`);
        } else if (colKey === "category_name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`c.name ILIKE $${queryValues.length}`);
        } else if (colKey === "brand_name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`b.name ILIKE $${queryValues.length}`);
        } else if (colKey === "posting_group_name") {
          queryValues.push(`%${filter.value}%`);
          whereClauses.push(`ipg.name ILIKE $${queryValues.length}`);
        } else if (colKey === "item_type_label") {
          const typeMap: Record<string, number> = {
            Inventory: 1,
            Service: 2,
            "Non Inventory": 3,
            "Raw Material": 4,
            "Finished Goods": 5,
            Asset: 6,
          };
          const numValue =
            typeMap[String(filter.value)] ?? Number(filter.value);
          if (!isNaN(numValue)) {
            queryValues.push(numValue);
            whereClauses.push(`i.item_type = $${queryValues.length}`);
          }
        } else if (colKey === "status_label") {
          const statusMap: Record<string, number> = {
            Active: 1,
            Inactive: 2,
            Discontinued: 3,
          };
          const numValue =
            statusMap[String(filter.value)] ?? Number(filter.value);
          if (!isNaN(numValue)) {
            queryValues.push(numValue);
            whereClauses.push(`i.status = $${queryValues.length}`);
          }
        }
      }
    });

    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

    const joinSql = `
      FROM items i
      LEFT JOIN item_categories c ON c.id = i.category_id
      LEFT JOIN item_brands b ON b.id = i.brand_id
      LEFT JOIN inventory_posting_groups ipg ON ipg.id = i.inventory_posting_group_id
    `;

    // Count Query
    const countQuery = `SELECT COUNT(DISTINCT i.id) as total ${joinSql} ${whereSql}`;
    const countResult = await pool.query(countQuery, queryValues);
    const totalRecords = parseInt(countResult.rows[0]?.total || "0", 10);

    // Paginated Query
    const dataQueryValues = [...queryValues, pageSize, offset];
    const limitIdx = dataQueryValues.length - 1;
    const offsetIdx = dataQueryValues.length;

    const dataQuery = `
      SELECT DISTINCT ON (i.id, ${orderByColumn})
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
      ${joinSql}
      ${whereSql}
      ORDER BY ${orderByColumn} ${orderDirection}, i.id ASC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const dataResult = await pool.query(dataQuery, dataQueryValues);

    return {
      data: dataResult.rows,
      totalRecords,
    };
  }
}
