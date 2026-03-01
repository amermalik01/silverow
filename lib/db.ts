// lib/db.ts

import { Pool, QueryResult, QueryResultRow } from "pg";

function ensureEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
  }
}

const globalForPool = globalThis as unknown as {
  pool: Pool | undefined;
};

export const pool =
  globalForPool.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPool.pool = pool;
}


// Generic parameterized query helper

export async function runQuery<T extends QueryResultRow = QueryResultRow>(
  query: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  ensureEnv();

  const client = await pool.connect();
  try {
    return await client.query<T>(query, params);
  } finally {
    client.release();
  }
}
// export async function runQuery<T extends QueryResultRow = any>(
//   query: string,
//   params: any[] = []
// ): Promise<QueryResult<T>> {
//   ensureEnv();
  
//   const client = await pool.connect();
//   try {
//     return await client.query<T>(query, params);
//   } finally {
//     client.release();
//   }
// }

export default pool;


// declare global {
//   var pgPool: Pool | undefined;
// }

// const pool =
//   global.pgPool ??
//   new Pool({
//     connectionString: process.env.DATABASE_URL,
//     ssl:
//       process.env.NODE_ENV === "production"
//         ? { rejectUnauthorized: false }
//         : false,
//   });

// if (process.env.NODE_ENV !== "production") {
//   global.pgPool = pool;
// }