// app/api/sales/crm/convert/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();

  const { account_id, company_id } = body;

  // 1. generate customer code
  const seq = await pool.query(`
    UPDATE sequences
    SET current_no = current_no + 1
    WHERE company_id = $1 AND module_name = 'customer'
    RETURNING prefix, current_no
  `, [company_id]);

  const { prefix, current_no } = seq.rows[0];

  const customer_code = `${prefix}-${current_no}`;

  // 2. update account
  const result = await pool.query(`
    UPDATE parties
    SET 
      type = 'customer',
      customer_code = $1
    WHERE id = $2
    RETURNING *
  `, [customer_code, account_id]);

  return NextResponse.json(result.rows[0]);
}