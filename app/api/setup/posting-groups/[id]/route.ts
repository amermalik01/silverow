// app/api/setup/posting-groups/[id]/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/* export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  const { name } = await req.json();

  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE posting_groups SET name=$1 WHERE id=$2 AND company_id=$3 RETURNING id,name`,
      [name, id, session?.user.company_id],
    );
    if (result.rowCount === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);
  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM posting_groups WHERE id=$1 AND company_id=$2 RETURNING id`,
      [id, session?.user.company_id],
    );
    if (result.rowCount === 0)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
} */
