// app/api/setup/sequences/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT id, module, display_name, prefix, current_value, padding FROM sequences
       WHERE company_id=$1
       ORDER BY module ASC`,
      [session?.user.company_id],
    );

    return NextResponse.json(result.rows);
  } finally {
    client.release();
  }
}
