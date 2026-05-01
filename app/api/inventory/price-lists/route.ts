// 📁 /api/inventory/price-lists/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  const result = await pool.query(
    `
    SELECT *
    FROM price_lists
    WHERE company_id = $1
    ORDER BY created_at DESC
    `,
    [companyId],
  );

  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  const body = await req.json();

  const result = await pool.query(
    `
    INSERT INTO price_lists (
      company_id,
      code,
      name,
      price_list_type,
      currency_id,
      valid_from,
      valid_to,
      customer_id,
      vendor_id,
      status
    )
    VALUES
    ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *
    `,
    [
      session?.user.company_id,
      body.code,
      body.name,
      body.price_list_type,
      body.currency_id,
      body.valid_from,
      body.valid_to,
      body.customer_id,
      body.vendor_id,
      body.status,
    ],
  );

  return NextResponse.json(result.rows[0]);
}
