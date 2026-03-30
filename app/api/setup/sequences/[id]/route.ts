// app/api/setup/sequences/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const { prefix, padding, display_name } = await req.json();

  const client = await pool.connect();

  try {
    const result = await client.query(
      `UPDATE sequences
        SET prefix = $1,
            padding = $2,
            display_name = $3
        WHERE id = $4`,
      [prefix, padding, display_name, id],
    );

    if (result.rowCount === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}
