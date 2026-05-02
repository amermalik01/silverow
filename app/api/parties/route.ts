// app/api/parties/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

/* =========================
   GET LIST
========================= */
export async function GET(req: Request) {
  const companyId = await getCompanyId();

  if (!companyId) {
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
  const values: (string | number)[] = [companyId];

  let i = 2;

  if (search) {
    where += `
      AND (
        name ILIKE $${i}
        OR crm_code ILIKE $${i}
        OR srm_code ILIKE $${i}
        OR customer_code ILIKE $${i}
        OR email ILIKE $${i}
        OR phone ILIKE $${i}
      )
    `;
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
    SELECT *
    FROM parties
    ${where}
    ORDER BY created_at DESC
    LIMIT $${i}
    OFFSET $${i + 1}
  `;

  values.push(limit, offset);

  const totalQuery = `
    SELECT COUNT(*)::int AS count
    FROM parties
    ${where}
  `;

  const client = await pool.connect();

  try {
    const data = await client.query(dataQuery, values);
    const total = await client.query(totalQuery, values.slice(0, i - 1));

    return NextResponse.json({
      data: data.rows,
      total: total.rows[0].count,
      page,
      limit,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch parties" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/* =========================
   CREATE PARTY
========================= */
export async function POST(req: Request) {
  const companyId = await getCompanyId();

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const {
    name,
    type,
    email,
    phone,
    mobile,
    website,
    status = "active",
    currency_id,
  } = body;

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      INSERT INTO parties (
        company_id,
        name,
        type,
        email,
        phone,
        mobile,
        website,
        status,
        currency_id,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
      RETURNING *
      `,
      [
        companyId,
        name,
        type,
        email || null,
        phone || null,
        mobile || null,
        website || null,
        status,
        currency_id || null,
      ],
    );

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create party" },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}