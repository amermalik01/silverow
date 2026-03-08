// lib/db.ts

import { Pool, QueryResult, QueryResultRow } from "pg";

const connectionString = process.env.DATABASE_URL;

function ensureEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
  }
}

const globalForPool = globalThis as unknown as {
  pool: Pool | undefined;
  poolInitialized: boolean | undefined;
};

// Singleton pattern to prevent multiple pools
export const pool =
  globalForPool.pool ??
  new Pool({
    connectionString,
    max: 10, 
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });


// attach listeners ONLY ONCE
if (!globalForPool.poolInitialized) {
  pool.on("error", (err) => {
    console.error("Unexpected error on idle client", err);
  });

  globalForPool.poolInitialized = true;
}


// pool.on('error', (err) => {
//   console.error('Unexpected error on idle client', err);
// });

if (process.env.NODE_ENV !== "production") {
  globalForPool.pool = pool;
}



// Generic parameterized query helper

export async function runQuery<T extends QueryResultRow = QueryResultRow>(
  query: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  ensureEnv();
  return pool.query<T>(query, params);

  // const client = await pool.connect();
  // try {
  //   return await client.query<T>(query, params);
  // } finally {
  //   client.release();
  // }
}

export function isDatabaseError(
  error: unknown
): error is { code: string; message: string; detail?: string; } {

  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error
  );
}

export default pool;
