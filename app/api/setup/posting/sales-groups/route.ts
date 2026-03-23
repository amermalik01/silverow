// app/api/setup/posting/sales-groups/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(){

  const session = await getServerSession(authOptions);

  const result = await pool.query(
    `SELECT id,name
     FROM sales_posting_groups
     WHERE company_id=$1
     ORDER BY name`,
    [session?.user.company_id]
  );

  return NextResponse.json(result.rows);
}

export async function POST(req:Request){

  const session = await getServerSession(authOptions);
  const body = await req.json();

  const result = await pool.query(
    `INSERT INTO sales_posting_groups
     (company_id,name,receivable_account_id,sales_account_id,discount_account_id,vat_account_id)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id`,
    [
      session?.user.company_id,
      body.name,
      body.receivable_account_id,
      body.sales_account_id,
      body.discount_account_id,
      body.vat_account_id
    ]
  );

  return NextResponse.json(result.rows[0]);
}