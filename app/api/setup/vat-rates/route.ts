// app/api/setup/vat-rates/route.ts

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
      SELECT *
      FROM vat_rates
      WHERE company_id = $1
      ORDER BY rate DESC
      `,
      [session?.user.company_id]
    );

    return NextResponse.json(result.rows);

  } finally {
    client.release();
  }
}

export async function POST(req: Request) {

  const session = await getServerSession(authOptions);

  const body = await req.json();

  const { name, rate } = body;

  const client = await pool.connect();

  try {

    const result = await client.query(
      `
      INSERT INTO vat_rates
      (company_id, name, rate)
      VALUES ($1,$2,$3)
      RETURNING *
      `,
      [session?.user.company_id, name, rate]
    );

    return NextResponse.json(result.rows[0]);

  } finally {
    client.release();
  }
}