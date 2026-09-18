// app/api/setup/inventory/brands/[id]/route.ts

import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const b = await req.json();

    await pool.query(
      `UPDATE item_brands SET 
        code = $1, code_prefix = $2, name = $3
       WHERE id = $4`,
      [b.code, b.code_prefix, b.name, id],
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Brands PUT Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await pool.query(`DELETE FROM item_brands WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Brands DELETE Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/* import {
  deleteRecord,
  getById,
  updateRecord,
} from "@/lib/services/master-data";

import { NextRequest, NextResponse } from "next/server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = await getById({
    table: "item_brands",
    id,
    companyId,
  });

  return NextResponse.json(data);
}

export async function PUT(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const data = await updateRecord({
    table: "item_brands",
    id,
    data: body,
    companyId,
  });

  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.company_id;

  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await deleteRecord({
    table: "item_brands",
    id,
    companyId,
  });

  return NextResponse.json({
    success: true,
  });
}
 */
