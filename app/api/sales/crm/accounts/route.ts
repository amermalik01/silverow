// app/api/sales/crm/accounts/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET all accounts
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await pool.query(
    `
    SELECT * FROM parties
    WHERE company_id = $1
    ORDER BY created_at DESC
    `,
    [session?.user.company_id],
  );

  return NextResponse.json(data.rows);
}

// CREATE account
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const companyId = session.user.company_id;

  // Generate CRM Code from sequence
  const seqResult = await pool.query(
    `SELECT get_next_sequence($1,$2) AS code`,
    [companyId, "crm_lead"] // module name from sequences table
  );

  const crmCode = seqResult.rows[0].code;

  const result = await pool.query(
    `
    INSERT INTO parties (
      company_id,
      crm_code,
      name,
      type,
      email,
      phone
    )
    VALUES ($1,$2,$3,'lead',$4,$5)
    RETURNING *
  `,
    [companyId, crmCode, body.name, body.email, body.phone]
  );

  return NextResponse.json(result.rows[0]);
}
/* export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const result = await pool.query(
    `
    INSERT INTO parties (
      company_id,
      crm_code,
      name,
      type,
      email,
      phone
    )
    VALUES ($1,$2,$3,'lead',$4,$5)
    RETURNING *
  `,
    [session.user.company_id, body.crm_code, body.name, body.email, body.phone],
  );

  return NextResponse.json(result.rows[0]);
} */
