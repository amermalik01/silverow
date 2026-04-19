// app/api/setup/warehouse-storage-types/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

// GET ALL
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;

    const res = await pool.query(
      `
      SELECT *
      FROM storage_types
      WHERE status = 1
      AND (company_id IS NULL OR company_id = $1)
      AND deleted_at IS NULL
      ORDER BY name ASC
      `,
      [companyId],
    );

    return NextResponse.json(res.rows);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch storage types" },
      { status: 500 },
    );
  }
}

// CREATE
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;

    const body = await req.json();

    const res = await pool.query(
      `
      INSERT INTO storage_types
      (code, name, description, status, company_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        body.code,
        body.name,
        body.description ?? null,
        body.status ?? 1,
        companyId, // 🔥 IMPORTANT
      ],
    );

    return NextResponse.json(res.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
