// // app/api/setup/sales/[type]/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const commonTables = ["segments", "territories"];

const crmTables = [
  "credit_ratings",
  "buying_groups",
  "sources",
  "order_sources",
];

const srmTables = ["selling_groups"];

function resolveTable(type: string): string | null {
  if (commonTables.includes(type)) {
    return type;
  }

  if (crmTables.includes(type)) {
    return `crm_${type}`;
  }

  if (srmTables.includes(type)) {
    return `srm_${type}`;
  }

  return null;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const session = await getServerSession(authOptions);
  const client = await pool.connect();

  const { type, id } = await params;
  const body = await req.json();
  const { name } = body;

  const table_name = resolveTable(type);

  if (!table_name) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    let query = "";
    let values: unknown[] = [];

    if (commonTables.includes(type)) {
      // const { module } = body;
      const { searchParams } = new URL(req.url);
      const module_type = body.module ?? searchParams.get("module");

      query = `
        UPDATE ${table_name}
        SET name = $1,
            module_type = $2,
            updated_at = now()
        WHERE id = $3
        AND company_id = $4
        RETURNING *
      `;

      values = [name, module_type, id, session?.user.company_id];
    } else {
      query = `
        UPDATE ${table_name}
        SET name = $1,
            updated_at = now()
        WHERE id = $2
        AND company_id = $3
        RETURNING *
      `;

      values = [name, id, session?.user.company_id];
    }

    const result = await client.query(query, values);

    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const session = await getServerSession(authOptions);
  const client = await pool.connect();

  const { type, id } = await params;

  const table_name = resolveTable(type);

  if (!table_name) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    const result = await client.query(
      `
      DELETE FROM ${table_name}
      WHERE id = $1
      AND company_id = $2
      `,
      [id, session?.user.company_id],
    );

    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
}
