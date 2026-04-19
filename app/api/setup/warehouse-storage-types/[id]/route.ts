// app/api/setup/warehouse-storage-types/[id]/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pool } from "@/lib/db";

// UPDATE
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;
    const body = await req.json();

    const res = await pool.query(
      `
        UPDATE storage_types
        SET code=$1,
            name=$2,
            description=$3,
            status=$4,
            updated_at=NOW()
        WHERE id=$5
        AND (company_id = $6 OR company_id IS NULL)
        RETURNING *
        `,
      [
        body.code,
        body.name,
        body.description ?? null,
        body.status ?? 1,
        id,
        companyId,
      ],
    );

    return NextResponse.json(res.rows[0]);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const companyId = session?.user?.company_id;
    await pool.query(
      `
        UPDATE storage_types
        SET deleted_at = NOW(), status = 0
        WHERE id = $1
        AND (company_id = $2 OR company_id IS NULL)
        `,
      [id, companyId],
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
