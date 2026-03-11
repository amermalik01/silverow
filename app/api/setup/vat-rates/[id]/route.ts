// app/api/setup/vat-rates/[id]/route.ts

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { params } = context;
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.company_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, rate } = body;

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      UPDATE vat_rates
      SET name=$1, rate=$2
      WHERE id=$3
      AND company_id=$4
      RETURNING id, name, rate
      `,
      [name, rate, id, session.user.company_id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "VAT rate not found" },
        { status: 404 },
      );
    }

    return NextResponse.json(result.rows[0]);
  } finally {
    client.release();
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { params } = context;
  const { id } = await params;

  const session = await getServerSession(authOptions);
  if (!session?.user?.company_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  try {
    const result = await client.query(
      `
      DELETE FROM vat_rates
      WHERE id=$1 AND company_id=$2
      RETURNING id
      `,
      [id, session.user.company_id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "VAT rate not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
}
