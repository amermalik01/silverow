// app/api/sales/crm/accounts/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);

  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "";
  const status = searchParams.get("status") || "";

  const offset = (page - 1) * limit;

  let where = `WHERE company_id = $1`;
  const values: (string | number | null | undefined)[] = [
    session.user.company_id,
  ];
  let i = 2;

  if (search) {
    where += ` AND (
      name ILIKE $${i}
      OR crm_code ILIKE $${i}
      OR email ILIKE $${i}
      OR phone ILIKE $${i}
    )`;
    values.push(`%${search}%`);
    i++;
  }

  if (type) {
    where += ` AND type = $${i}`;
    values.push(type);
    i++;
  }

  if (status) {
    where += ` AND status = $${i}`;
    values.push(status);
    i++;
  }

  const dataQuery = `
    SELECT
      id,
      crm_code,
      customer_code,
      name,
      type,
      status,
      email,
      phone,
      mobile,
      website,
      credit_limit,
      created_at
    FROM parties
    ${where}
    ORDER BY created_at DESC
    LIMIT $${i}
    OFFSET $${i + 1}
  `;

  values.push(limit, offset);

  const totalQuery = `
    SELECT COUNT(*) FROM parties ${where}
  `;

  try {
    const client = await pool.connect();
    const dataResult = await client.query(dataQuery, values);
    const totalResult = await client.query(totalQuery, values.slice(0, i - 1));
    client.release();

    return NextResponse.json({
      data: dataResult.rows,
      total: Number(totalResult.rows[0].count),
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch CRM accounts" },
      { status: 500 },
    );
  }
}

// GET all accounts
/* export async function GET(req: Request) {
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
} */

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
    [companyId, "crm_lead"], // module name from sequences table
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
    [companyId, crmCode, body.name, body.email, body.phone],
  );

  return NextResponse.json(result.rows[0]);
}
