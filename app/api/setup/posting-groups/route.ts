// app/api/setup/posting-groups/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM posting_groups WHERE company_id=$1 ORDER BY name ASC`,
      [session?.user.company_id],
    );
    return NextResponse.json(result.rows);
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const { name } = await req.json();
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO posting_groups (company_id, name) VALUES ($1,$2) RETURNING id,name`,
      [session?.user.company_id, name],
    );
    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}
