// app/api/sales/crm/notes/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);

  const moduleName = searchParams.get("module");
  const recordId = searchParams.get("record_id");

  const data = await pool.query(
    `
    SELECT *
    FROM notes
    WHERE module=$1
    AND record_id=$2
    ORDER BY created_at DESC
    `,
    [moduleName, recordId]
  );

  return NextResponse.json(data.rows);
}

export async function POST(req: Request) {

  const body = await req.json();

  const result = await pool.query(
    `
    INSERT INTO notes (
      company_id,
      module,
      record_id,
      note
    )
    VALUES ($1,$2,$3,$4)
    RETURNING *
    `,
    [
      body.company_id,
      body.module,
      body.record_id,
      body.note
    ]
  );

  return NextResponse.json(result.rows[0]);

}