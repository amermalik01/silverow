// app/api/sales/crm/contacts/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();

  const result = await pool.query(`
    INSERT INTO crm_contacts (
      account_id,
      name,
      email,
      phone,
      is_primary
    )
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
  `, [
    body.account_id,
    body.name,
    body.email,
    body.phone,
    body.is_primary || false
  ]);

  return NextResponse.json(result.rows[0]);
}