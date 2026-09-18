// app/api/setup/inventory/brands/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

export async function GET() {
  try {
    const companyId = await getCompanyId();
    if (!companyId) return NextResponse.json([], { status: 401 });

    const result = await pool.query(
      `SELECT *
       FROM item_brands
       WHERE company_id = $1 
       ORDER BY created_at DESC`,
      [companyId],
    );
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Brands GET Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const companyId = await getCompanyId();
    if (!companyId) return NextResponse.json([], { status: 401 });
    const b = await req.json();

    const result = await pool.query(
      `INSERT INTO item_brands 
       (company_id, code, code_prefix, name)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [companyId, b.code, b.code_prefix, b.name],
    );
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Brands POST Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/* import { createRecord, getList } from "@/lib/services/master-data";

import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const search = req.nextUrl.searchParams.get("search") || "";

  const data = await getList({
    table: "item_brands",
    companyId,
    searchableColumns: ["code", "name"],
    search,
    orderBy: "name",
    orderDirection: "ASC",
  });

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await createRecord({
    table: "item_brands",
    data: {
      ...body,
      company_id: companyId,
    },
  });

  return NextResponse.json(data);
} */
