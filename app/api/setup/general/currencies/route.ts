// app/api/setup/general/currencies/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const result = await pool.query(`
    SELECT id, code, name, symbol
    FROM currencies
    WHERE status = 1
    ORDER BY name
  `);

  return NextResponse.json(result.rows);
}