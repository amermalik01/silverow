// app/api/table-config/reset/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const moduleKey = searchParams.get("moduleKey");
  const userId = "DEFAULT_USER";

  try {
    await pool.query(
      `DELETE FROM table_column_configs WHERE user_id = $1 AND module_key = $2`,
      [userId, moduleKey],
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
