// app/api/setup/vat-posting-setup/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {

  const session = await getServerSession(authOptions);
  const client = await pool.connect();

  try {

    const result = await client.query(
      `
      SELECT
        s.id,        
        concat(ROUND(s.vat_rate,0),'%') as vat_rate,
        s.vat_rate as vat_value,
        concat(b.name,' - ',p.name) as vat_posting_group,
        b.name as business_group,
        p.name as product_group
      FROM vat_posting_setup s
      JOIN vat_business_posting_groups b
        ON b.id = s.vat_business_group_id
      JOIN vat_product_posting_groups p
        ON p.id = s.vat_product_group_id
      WHERE s.company_id=$1
      ORDER BY b.name,p.name
      `,
      [session?.user.company_id]
    );

    return NextResponse.json(result.rows);

  } finally {
    client.release();
  }
}

export async function POST(req:Request){

  const session = await getServerSession(authOptions);
  const body = await req.json();

  const client = await pool.connect();

  try{

    const result = await client.query(
      `
      INSERT INTO vat_posting_setup
      (company_id,vat_business_group_id,vat_product_group_id,vat_rate,sales_vat_account_id,purchase_vat_account_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING id
      `,
      [
        session?.user.company_id,
        body.vat_business_group_id,
        body.vat_product_group_id,
        body.vat_rate,
        body.sales_vat_account_id,
        body.purchase_vat_account_id
      ]
    );

    return NextResponse.json(result.rows[0]);

  } finally{
    client.release();
  }
}