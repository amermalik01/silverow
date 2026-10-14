// app/api/notes/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const { note, module, record_id } = body;

    if (typeof note !== "string" || !note.trim() || !module || !record_id) {
      return NextResponse.json(
        { error: "Note, module, and record_id are required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `UPDATE notes
       SET note = $1
       WHERE id = $2
         AND company_id = $3
         AND module = $4
         AND record_id = $5
       RETURNING id, note, created_at, created_by`,
      [note.trim(), id, session.user.company_id, module, record_id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ data: result.rows[0] });
  } catch (err) {
    console.error("PUT Note Error:", err);

    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 },
    );
  }
}

// Delete an existing note
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = req.nextUrl;

    const moduleName = searchParams.get("module");
    const recordId = searchParams.get("record_id");

    if (!module || !recordId) {
      return NextResponse.json(
        { error: "Module and record_id are required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `DELETE FROM notes
       WHERE id = $1
         AND company_id = $2
         AND module = $3
         AND record_id = $4`,
      [id, session.user.company_id, moduleName, recordId],
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE Note Error:", err);

    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 },
    );
  }
}
/* export async function DELETE(req: NextRequest, { params }: Context) {
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
} */
