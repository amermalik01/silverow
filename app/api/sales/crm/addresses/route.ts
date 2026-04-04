// app/api/sales/crm/addresses/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();

  const result = await pool.query(`
    INSERT INTO party_addresses (
      account_id,
      address_1,
      city,
      country_id,
      is_primary,
      is_billing,
      is_shipping
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING *
  `, [
    body.account_id,
    body.address_1,
    body.city,
    body.country_id,
    body.is_primary || false,
    body.is_billing || false,
    body.is_shipping || false
  ]);

  return NextResponse.json(result.rows[0]);
}