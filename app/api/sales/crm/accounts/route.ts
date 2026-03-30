// app/api/sales/crm/accounts/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET all accounts
export async function GET(req: Request) {
  const data = await pool.query(`
    SELECT * FROM crm_accounts
    ORDER BY created_at DESC
  `);

  return NextResponse.json(data.rows);
}

// CREATE account
export async function POST(req: Request) {
  const body = await req.json();

  const result = await pool.query(`
    INSERT INTO crm_accounts (
      company_id,
      crm_code,
      name,
      type,
      email,
      phone
    )
    VALUES ($1,$2,$3,'lead',$4,$5)
    RETURNING *
  `, [
    body.company_id,
    body.crm_code,
    body.name,
    body.email,
    body.phone
  ]);

  return NextResponse.json(result.rows[0]);
}