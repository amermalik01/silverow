// app/api/sales/crm/opportunities/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: Request) {

  const { searchParams } = new URL(req.url);

  const leadId = searchParams.get("lead_id");

  const data = await pool.query(
    `
    SELECT *
    FROM crm_opportunities
    WHERE lead_id=$1
    ORDER BY created_at DESC
    `,
    [leadId]
  );

  return NextResponse.json(data.rows);

}

export async function POST(req: Request) {

  const body = await req.json();

  const result = await pool.query(
    `
    INSERT INTO crm_opportunities (
      company_id,
      lead_id,
      name,
      value,
      probability,
      expected_close_date
    )
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
    `,
    [
      body.company_id,
      body.lead_id,
      body.name,
      body.value,
      body.probability,
      body.expected_close_date
    ]
  );

  return NextResponse.json(result.rows[0]);

}