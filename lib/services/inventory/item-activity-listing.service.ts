// lib/services/inventory/item-activity-listing.service.ts

import type { QueryResultRow } from "pg";

import { pool } from "@/lib/db";
import type { FetchParams, FetchResponse } from "@/types/table";

import {
  warehouseStockQuery,
  transactionsQuery,
  type ItemMovement,
  type ItemWarehouseStock,
} from "./item-activity.service";

type FilterEntry = {
  value?: string | number | boolean | null;
  from?: string | number | null;
  to?: string | number | null;
  matchMode?: string;
};

type ListingFilters = Record<
  string,
  FilterEntry | string | number | boolean | null | undefined
>;

type NumericValue = string | number | null;

type MovementListingRow = QueryResultRow &
  Omit<
    ItemMovement,
    "quantity" | "remaining_quantity" | "unit_cost" | "total_cost"
  > & {
    quantity: NumericValue;
    remaining_quantity: NumericValue;
    unit_cost: NumericValue;
    total_cost: NumericValue;
  };

type WarehouseListingRow = QueryResultRow &
  Omit<
    ItemWarehouseStock,
    "quantity" | "reserved_quantity" | "available_quantity" | "average_cost"
  > & {
    quantity: NumericValue;
    reserved_quantity: NumericValue;
    available_quantity: NumericValue;
    average_cost: NumericValue;
  };

export interface ItemWarehouseStockListing extends ItemWarehouseStock {
  /** Stable DataTable row key: one row per warehouse in the current query. */
  id: string;
}

const toNumber = (value: NumericValue): number => {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
};

function getFilterValue(filter: unknown): FilterEntry | null {
  if (filter === null || filter === undefined || filter === "") {
    return null;
  }

  if (
    typeof filter === "string" ||
    typeof filter === "number" ||
    typeof filter === "boolean"
  ) {
    return { value: filter };
  }

  if (typeof filter === "object") {
    const candidate = filter as Record<string, unknown>;

    return {
      value:
        typeof candidate.value === "string" ||
        typeof candidate.value === "number" ||
        typeof candidate.value === "boolean"
          ? candidate.value
          : null,
      from:
        typeof candidate.from === "string" || typeof candidate.from === "number"
          ? candidate.from
          : null,
      to:
        typeof candidate.to === "string" || typeof candidate.to === "number"
          ? candidate.to
          : null,
      matchMode:
        typeof candidate.matchMode === "string"
          ? candidate.matchMode
          : undefined,
    };
  }

  return null;
}

function getFilterText(filter: FilterEntry): string {
  return String(filter.value ?? "").trim();
}

function getPagination(params: FetchParams) {
  const page = Math.max(1, Math.trunc(Number(params.page) || 1));

  const pageSize = Math.min(
    100,
    Math.max(1, Math.trunc(Number(params.pageSize) || 20)),
  );

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}

/**
 * The original ItemActivityService query limits its CTE to 200 rows
 * because it is used for the activity summary/modal use cases.
 *
 * This listing query must not inherit that limit. Pagination is
 * applied to the final result after search and filters.
 */
const unboundedTransactionsQuery = transactionsQuery.replace(
  /\s+LIMIT 200\s*\n\s*\)/,
  "\n  )",
);

if (unboundedTransactionsQuery === transactionsQuery) {
  throw new Error(
    "Unable to remove the existing 200-row limit from transactionsQuery.",
  );
}

async function assertItemExists(
  companyId: string,
  itemId: string,
): Promise<void> {
  const result = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM items
      WHERE id = $1
        AND company_id = $2
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [itemId, companyId],
  );

  if (result.rowCount === 0) {
    throw new Error("ITEM_NOT_FOUND");
  }
}

function appendFilter(
  where: string[],
  values: Array<string | number | boolean>,
  expression: string,
  filter: FilterEntry,
): void {
  const value = getFilterText(filter);

  if (value) {
    const matchMode = filter.matchMode?.toLowerCase();

    values.push(matchMode === "equals" ? value : `%${value}%`);

    const parameter = `$${values.length}`;

    where.push(
      matchMode === "equals"
        ? `${expression} = ${parameter}`
        : `${expression} ILIKE ${parameter}`,
    );
  }

  if (filter.from !== null && filter.from !== undefined && filter.from !== "") {
    values.push(String(filter.from));

    where.push(`${expression} >= $${values.length}`);
  }

  if (filter.to !== null && filter.to !== undefined && filter.to !== "") {
    values.push(String(filter.to));

    where.push(`${expression} <= $${values.length}`);
  }
}

function buildListingFilters(
  params: FetchParams,
  mode: "movements" | "warehouse",
  companyId: string,
  itemId: string,
): {
  whereSql: string;
  values: Array<string | number | boolean>;
} {
  // Reserve the original SQL parameter positions.
  const values: Array<string | number | boolean> =
    mode === "movements" ? [companyId, itemId, false] : [companyId, itemId];

  const where: string[] = [];

  const search = typeof params.search === "string" ? params.search.trim() : "";

  if (search) {
    values.push(`%${search}%`);

    const parameter = `$${values.length}`;

    if (mode === "movements") {
      where.push(`
        (
          listing.transaction_no ILIKE ${parameter}
          OR COALESCE(listing.invoice_no, '') ILIKE ${parameter}
          OR listing.transaction_type ILIKE ${parameter}
          OR listing.warehouse_name ILIKE ${parameter}
          OR COALESCE(listing.batch_no, '') ILIKE ${parameter}
          OR COALESCE(listing.serial_no, '') ILIKE ${parameter}
          OR COALESCE(listing.tracking_code, '') ILIKE ${parameter}
        )
      `);
    } else {
      where.push(`
        (
          listing.warehouse_name ILIKE ${parameter}
          OR COALESCE(listing.warehouse_code, '') ILIKE ${parameter}
        )
      `);
    }
  }

  const filters = (params.filters ?? {}) as ListingFilters;

  const allowedFilters: Record<string, string> =
    mode === "movements"
      ? {
          transaction_no: "listing.transaction_no",
          transaction_type: "listing.transaction_type",
          invoice_no: "listing.invoice_no",
          warehouse_name: "listing.warehouse_name",
          batch_no: "listing.batch_no",
          serial_no: "listing.serial_no",
          movement_direction: "listing.movement_direction",
          status: "listing.status",
          posting_date: "listing.posting_date",
        }
      : {
          warehouse_name: "listing.warehouse_name",
          warehouse_code: "listing.warehouse_code",
        };

  for (const [key, rawFilter] of Object.entries(filters)) {
    const expression = allowedFilters[key];

    if (!expression) continue;

    const filter = getFilterValue(rawFilter);

    if (!filter) continue;

    appendFilter(where, values, expression, filter);
  }

  return {
    whereSql: where.length ? `WHERE ${where.join(" AND ")}` : "",
    values,
  };
}

const MOVEMENT_SORT_FIELDS: Record<string, string> = {
  posting_date: "listing.posting_date",
  transaction_no: "listing.transaction_no",
  transaction_type: "listing.transaction_type",
  invoice_no: "listing.invoice_no",
  warehouse_name: "listing.warehouse_name",
  quantity: "listing.quantity",
  movement_direction: "listing.movement_direction",
  unit_cost: "listing.unit_cost",
  total_cost: "listing.total_cost",
  batch_no: "listing.batch_no",
  serial_no: "listing.serial_no",
  created_at: "listing.created_at",
};

const WAREHOUSE_SORT_FIELDS: Record<string, string> = {
  warehouse_name: "listing.warehouse_name",
  warehouse_code: "listing.warehouse_code",
  quantity: "listing.quantity",
  reserved_quantity: "listing.reserved_quantity",
  available_quantity: "listing.available_quantity",
  average_cost: "listing.average_cost",
  expiry_date: "listing.expiry_date",
  last_movement_at: "listing.last_movement_at",
};

function getOrderBy(
  params: FetchParams,
  fields: Record<string, string>,
  defaultField: string,
): string {
  const sortBy = typeof params.sortBy === "string" ? params.sortBy : "";

  const column = fields[sortBy] ?? defaultField;

  const direction = params.sortOrder?.toLowerCase() === "asc" ? "ASC" : "DESC";

  return `${column} ${direction} NULLS LAST`;
}

export class ItemActivityListingService {
  /**
   * Paginated movement transaction listing.
   *
   * Each inventory ledger entry remains an individual row.
   * Do not group by reference_id: separate OUT rows can represent
   * separate physical inbound layers consumed by one dispatch.
   */
  static async listMovementsPaginated(
    companyId: string,
    itemId: string,
    params: FetchParams,
  ): Promise<FetchResponse<ItemMovement>> {
    await assertItemExists(companyId, itemId);

    const { pageSize, offset } = getPagination(params);

    const { whereSql, values: baseValues } = buildListingFilters(
      params,
      "movements",
      companyId,
      itemId,
    );

    // const { whereSql, values } = buildListingFilters(params, "movements");

    // const baseValues: Array<string | number> = [companyId, itemId, ...values];

    const listingQuery = `
      SELECT *
      FROM (${unboundedTransactionsQuery}) AS listing
      ${whereSql}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total_records
      FROM (${unboundedTransactionsQuery}) AS listing
      ${whereSql}
    `;

    const orderBy = getOrderBy(
      params,
      MOVEMENT_SORT_FIELDS,
      "listing.posting_date",
    );

    const [countResult, dataResult] = await Promise.all([
      pool.query<{ total_records: number }>(countQuery, baseValues),

      pool.query<MovementListingRow>(
        `
      ${listingQuery}
      ORDER BY ${orderBy}, listing.id DESC
      LIMIT $${baseValues.length + 1}
      OFFSET $${baseValues.length + 2}
    `,
        [...baseValues, pageSize, offset],
      ),
    ]);

    const data: ItemMovement[] = dataResult.rows.map((row) => ({
      ...row,
      quantity: toNumber(row.quantity),
      remaining_quantity: toNumber(row.remaining_quantity),
      unit_cost: toNumber(row.unit_cost),
      total_cost: toNumber(row.total_cost),
    }));

    return {
      data,
      totalRecords: Number(countResult.rows[0]?.total_records ?? 0),
    };
  }

  /**
   * Paginated warehouse stock listing.
   *
   * The existing warehouseStockQuery currently returns one aggregate
   * row per warehouse. This listing preserves that same calculation.
   */
  static async listWarehouseStockPaginated(
    companyId: string,
    itemId: string,
    params: FetchParams,
  ): Promise<FetchResponse<ItemWarehouseStockListing>> {
    await assertItemExists(companyId, itemId);

    const { pageSize, offset } = getPagination(params);

    const { whereSql, values: baseValues } = buildListingFilters(
      params,
      "warehouse",
      companyId,
      itemId,
    );

    const listingQuery = `
      SELECT *
      FROM (${warehouseStockQuery}) AS listing
      ${whereSql}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total_records
      FROM (${warehouseStockQuery}) AS listing
      ${whereSql}
    `;

    const orderBy = getOrderBy(
      params,
      WAREHOUSE_SORT_FIELDS,
      "listing.warehouse_name",
    );

    const [countResult, dataResult] = await Promise.all([
      pool.query<{ total_records: number }>(countQuery, baseValues),

      pool.query<WarehouseListingRow>(
        `
          ${listingQuery}
          ORDER BY ${orderBy}, listing.warehouse_id ASC
          LIMIT $${baseValues.length + 1}
          OFFSET $${baseValues.length + 2}
        `,
        [...baseValues, pageSize, offset],
      ),
    ]);

    const data: ItemWarehouseStockListing[] = dataResult.rows.map((row) => ({
      id: row.warehouse_id,
      warehouse_id: row.warehouse_id,
      warehouse_name: row.warehouse_name,
      warehouse_code: row.warehouse_code,
      location_id: row.location_id,
      location_title: row.location_title,
      location_code: row.location_code,
      batch_no: row.batch_no,
      serial_no: row.serial_no,
      quantity: toNumber(row.quantity),
      reserved_quantity: toNumber(row.reserved_quantity),
      available_quantity: toNumber(row.available_quantity),
      average_cost: toNumber(row.average_cost),
      expiry_date: row.expiry_date,
      last_movement_at: row.last_movement_at,
    }));

    return {
      data,
      totalRecords: Number(countResult.rows[0]?.total_records ?? 0),
    };
  }
}
