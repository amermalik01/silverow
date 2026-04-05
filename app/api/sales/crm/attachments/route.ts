// app/api/sales/crm/attachments/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);

  const moduleName = searchParams.get("module");
  const recordId = searchParams.get("record_id");

  const data = await pool.query(
    `
    SELECT *
    FROM attachments
    WHERE module=$1
    AND record_id=$2
    `,
    [moduleName, recordId]
  );

  return NextResponse.json(data.rows);

}