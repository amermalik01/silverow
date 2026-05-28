// app/api/setup/posting/sales-groups/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Swapped account_code with code
    const result = await pool.query(
      `SELECT g.id, g.name, g.receivable_account_id, g.sales_account_id, g.discount_account_id, g.vat_account_id,
              CONCAT(a1.code, ' - ', a1.name) as receivable_account,
              CONCAT(a2.code, ' - ', a2.name) as sales_account,
              CONCAT(a3.code, ' - ', a3.name) as discount_account,
              CONCAT(a4.code, ' - ', a4.name) as vat_account
       FROM sales_posting_groups g
       LEFT JOIN chart_of_accounts a1 ON g.receivable_account_id = a1.id
       LEFT JOIN chart_of_accounts a2 ON g.sales_account_id = a2.id
       LEFT JOIN chart_of_accounts a3 ON g.discount_account_id = a3.id
       LEFT JOIN chart_of_accounts a4 ON g.vat_account_id = a4.id
       WHERE g.company_id = $1 ORDER BY g.name`,
      [session.user.company_id],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Sales Groups GET Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const b = await req.json();

    const result = await pool.query(
      `INSERT INTO sales_posting_groups 
       (company_id, name, receivable_account_id, sales_account_id, discount_account_id, vat_account_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        session.user.company_id,
        b.name,
        b.receivable_account_id,
        b.sales_account_id,
        b.discount_account_id,
        b.vat_account_id,
      ],
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Sales Groups POST Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/* import { NextResponse } from "next/server";
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
} */
