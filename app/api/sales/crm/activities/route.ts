// app/api/sales/crm/activities/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);

  const moduleName = searchParams.get("module");
  const recordId = searchParams.get("record_id");

  const data = await pool.query(
    `
    SELECT *
    FROM activities
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
    INSERT INTO activities (
      company_id,
      module,
      record_id,
      type,
      title,
      description,
      due_date
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
    `,
    [
      body.company_id,
      body.module,
      body.record_id,
      body.type,
      body.title,
      body.description,
      body.due_date
    ]
  );

  return NextResponse.json(result.rows[0]);

}