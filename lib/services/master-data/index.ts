// lib/services/master-data/index.ts

import { PoolClient, QueryResult, QueryResultRow } from "pg";
import { pool } from "@/lib/db";

type Primitive = string | number | boolean | null | undefined | Date;

type DataRecord = Record<string, Primitive>;

type Filters = Record<string, Primitive>;

type ListOptions = {
  table: string;
  companyId: string;

  searchableColumns?: string[];

  search?: string;

  orderBy?: string;

  orderDirection?: "ASC" | "DESC";

  limit?: number;

  offset?: number;

  filters?: Filters;

  select?: string;
};

type GetByIdOptions = {
  table: string;

  id: string;

  companyId?: string;

  select?: string;
};

type CreateOptions = {
  table: string;

  data: DataRecord;

  client?: PoolClient;
};

type UpdateOptions = {
  table: string;

  id: string;

  data: DataRecord;

  companyId?: string;

  client?: PoolClient;
};

type DeleteOptions = {
  table: string;

  id: string;

  companyId?: string;

  softDelete?: boolean;

  client?: PoolClient;
};

export async function getList<T extends QueryResultRow>({
  table,
  companyId,
  searchableColumns = [],
  search = "",
  orderBy = "created_at",
  orderDirection = "DESC",
  limit = 100,
  offset = 0,
  filters = {},
  select = "*",
}: ListOptions): Promise<T[]> {
  const values: Primitive[] = [];

  let query = `
    SELECT ${select}
    FROM ${table}
    WHERE (
      company_id IS NULL
      OR company_id = $1
    )
  `;

  values.push(companyId);

  // Search
  if (search && searchableColumns.length > 0) {
    const searchConditions = searchableColumns.map((col) => {
      values.push(`%${search}%`);

      return `${col} ILIKE $${values.length}`;
    });

    query += `
      AND (
        ${searchConditions.join(" OR ")}
      )
    `;
  }

  // Filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      values.push(value);

      query += `
          AND ${key} = $${values.length}
        `;
    }
  });

  query += `
    ORDER BY ${orderBy} ${orderDirection}
  `;

  values.push(limit);

  query += `
    LIMIT $${values.length}
  `;

  values.push(offset);

  query += `
    OFFSET $${values.length}
  `;

  const result: QueryResult<T> = await pool.query(query, values);

  return result.rows;
}

export async function getById<T extends QueryResultRow>({
  table,
  id,
  companyId,
  select = "*",
}: GetByIdOptions): Promise<T | null> {
  const values: Primitive[] = [id];

  let query = `
    SELECT ${select}
    FROM ${table}
    WHERE id = $1
  `;

  if (companyId) {
    values.push(companyId);

    query += `
      AND (
        company_id IS NULL
        OR company_id = $2
      )
    `;
  }

  const result: QueryResult<T> = await pool.query(query, values);

  return result.rows[0] || null;
}

export async function createRecord<T extends QueryResultRow>({
  table,
  data,
  client,
}: CreateOptions): Promise<T> {
  const db = client || pool;

  const cleanData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (value === "") return [key, null];
      return [key, value];
    }),
  );

  const keys = Object.keys(cleanData);
  const values = Object.values(cleanData);

  const columns = keys.join(",");

  const placeholders = keys.map((_, i) => `$${i + 1}`).join(",");

  const query = `
    INSERT INTO ${table}
    (${columns})
    VALUES (${placeholders})
    RETURNING *
  `;

  const result: QueryResult<T> = await db.query(query, values);

  return result.rows[0];
}

export async function updateRecord<T extends QueryResultRow>({
  table,
  id,
  data,
  companyId,
  client,
}: UpdateOptions): Promise<T> {
  const db = client || pool;

  const cleanData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (value === "") return [key, null];
      return [key, value];
    }),
  );

  const keys = Object.keys(cleanData);
  const values = Object.values(cleanData);

  const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(",");

  values.push(id);

  let query = `
    UPDATE ${table}
    SET
      ${setClause}
    WHERE id = $${values.length}
  `;

  if (companyId) {
    values.push(companyId);

    query += `
      AND (
        company_id IS NULL
        OR company_id = $${values.length}
      )
    `;
  }

  query += `
    RETURNING *
  `;

  const result: QueryResult<T> = await db.query(query, values);

  return result.rows[0];
}

export async function deleteRecord({
  table,
  id,
  companyId,
  softDelete = true,
  client,
}: DeleteOptions): Promise<{ success: boolean } | DataRecord> {
  const db = client || pool;

  const values: Primitive[] = [id];

  let query = "";

  //   if (softDelete) {
  //     query = `
  //       UPDATE ${table}
  //       SET deleted_at = NOW()
  //       WHERE id = $1
  //     `;
  //   } else {
  query = `
      DELETE FROM ${table}
      WHERE id = $1
    `;
  //   }

  if (companyId) {
    values.push(companyId);

    query += `
      AND (
        company_id IS NULL
        OR company_id = $${values.length}
      )
    `;
  }

  if (softDelete) {
    query += `
      RETURNING *
    `;

    const result = await db.query(query, values);

    return (
      result.rows[0] || {
        success: false,
      }
    );
  }

  await db.query(query, values);

  return {
    success: true,
  };
}
