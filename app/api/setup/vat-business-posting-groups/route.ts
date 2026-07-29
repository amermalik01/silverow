// app/api/setup/vat-business-posting-groups/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { error: "Access Denied. Unauthorized Session Check." },
      { status: 401 },
    );
  }
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT id,name 
       FROM vat_business_posting_groups
       WHERE company_id=$1
       ORDER BY name ASC`,
      [companyId],
    );

    return NextResponse.json(result.rows);
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const companyId = await getCompanyId();
  if (!companyId) {
    return NextResponse.json(
      { error: "Access Denied. Unauthorized Session Check." },
      { status: 401 },
    );
  }
  const { name } = await req.json();

  const client = await pool.connect();

  try {
    const result = await client.query(
      `INSERT INTO vat_business_posting_groups (company_id,name)
       VALUES ($1,$2)
       RETURNING id,name`,
      [companyId, name],
    );

    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}
