// app/api/notes/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const result = await pool.query(
      `DELETE FROM notes WHERE id = $1 AND company_id = $2`,
      [id, session.user.company_id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Note not found or multi-tenant context breach block" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE Note Exception Log:", err);
    return NextResponse.json(
      { error: "Failed to delete note record" },
      { status: 500 },
    );
  }
}
/* import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await pool.query(
      `
      DELETE FROM notes
      WHERE id = $1
      `,
      [id],
    );

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 },
    );
  }
} */
