// app/api/setup/sales/[type]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// interface RouteContext {
//   params: {
//     type: string;
//   };
// }

export async function GET(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await getServerSession(authOptions);
  const client = await pool.connect();

  const { type } = await params;

  const { searchParams } = new URL(req.url);
  const module_type = searchParams.get("module") ?? "sales";

  const commonTables = ["segments", "territories"];

  const crmTables = [
    "credit_ratings",
    "buying_groups",
    "sources",
    "order_sources",
  ];

  const srmTables = ["selling_groups"];

  let table_name = "";

  if (commonTables.includes(type)) {
    table_name = type;
  } else if (crmTables.includes(type)) {
    table_name = `crm_${type}`;
  } else if (srmTables.includes(type)) {
    table_name = `srm_${type}`;
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    let query = "";
    let values: unknown[] = [];

    if (commonTables.includes(type)) {
      query = `
        SELECT *
        FROM ${table_name}
        WHERE company_id = $1
        AND module_type = $2
        ORDER BY name
      `;
      values = [session?.user.company_id, module_type];
    } else {
      query = `
        SELECT *
        FROM ${table_name}
        WHERE company_id = $1
        ORDER BY name
      `;
      values = [session?.user.company_id];
    }

    const result = await client.query(query, values);
    return NextResponse.json(result.rows);
  } finally {
    client.release();
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await getServerSession(authOptions);
  const client = await pool.connect();

  const { type } = await params;
  const body = await req.json();

  const { name, module } = body;

  const commonTables = ["segments", "territories"];

  const crmTables = [
    "credit_ratings",
    "buying_groups",
    "sources",
    "order_sources",
  ];

  const srmTables = ["selling_groups"];

  let table_name = "";

  if (commonTables.includes(type)) {
    table_name = type;
  } else if (crmTables.includes(type)) {
    table_name = `crm_${type}`;
  } else if (srmTables.includes(type)) {
    table_name = `srm_${type}`;
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    let query = "";
    let values: unknown[] = [];

    if (commonTables.includes(type)) {
      query = `
        INSERT INTO ${table_name}
        (company_id, module_type, name)
        VALUES ($1,$2,$3)
        RETURNING *
      `;

      values = [session?.user.company_id, module, name];
    } else {
      query = `
        INSERT INTO ${table_name}
        (company_id, name)
        VALUES ($1,$2)
        RETURNING *
      `;

      values = [session?.user.company_id, name];
    }

    const result = await client.query(query, values);

    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}
