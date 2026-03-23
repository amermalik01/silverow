// app/api/setup/posting/purchase-groups/route.ts

import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET(){

  const session = await getServerSession(authOptions);

  const result = await pool.query(
    `SELECT id,name
     FROM purchase_posting_groups
     WHERE company_id=$1`,
    [session?.user.company_id]
  );

  return NextResponse.json(result.rows);
}

export async function POST(req:Request){

  const session = await getServerSession(authOptions);
  const body = await req.json();

  const result = await pool.query(
    `INSERT INTO purchase_posting_groups
     (company_id,name,payable_account_id,purchase_account_id,discount_account_id,vat_account_id,inventory_account_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [
      session?.user.company_id,
      body.name,
      body.payable_account_id,
      body.purchase_account_id,
      body.discount_account_id,
      body.vat_account_id,
      body.inventory_account_id
    ]
  );

  return NextResponse.json(result.rows[0]);
}