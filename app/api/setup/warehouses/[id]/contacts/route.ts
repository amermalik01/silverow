// app/api/setup/warehouses/[id]/contacts/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const res = await pool.query(
    `SELECT * FROM warehouse_contacts WHERE warehouse_id=$1`,
    [id],
  );

  return NextResponse.json(res.rows);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const companyId = session.user.company_id;

  const res = await pool.query(
    `
    INSERT INTO warehouse_contacts
    (warehouse_id, company_id, name, email, phone, mobile, job_title, type, status)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      id,
      companyId,
      body.name,
      body.email ?? null,
      body.phone ?? null,
      body.mobile ?? null,
      body.job_title ?? null,
      body.type,
      body.status ?? 1,
    ],
  );

  return NextResponse.json(res.rows[0]);
}

/* export async function POST(req: Request, params: Promise<{ id: string }>) {
  const { id } = await params;
  const body = await req.json();

  const res = await pool.query(
    `
    INSERT INTO warehouse_contacts
    (warehouse_id, company_id, name, email, phone, type)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [id, body.company_id, body.name, body.email, body.phone, body.type],
  );

  return NextResponse.json(res.rows[0]);
}
 */
