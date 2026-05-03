// app/api/notes/route.ts

import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.company_id;

    const searchParams = req.nextUrl.searchParams;

    const current_module = searchParams.get("module");
    const recordId = searchParams.get("record_id");

    if (!current_module || !recordId) {
      return NextResponse.json(
        { error: "module and record_id required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `
      SELECT *
      FROM notes
      WHERE company_id = $1
      AND module = $2
      AND record_id = $3
      ORDER BY created_at DESC
      `,
      [companyId, current_module, recordId],
    );

    return NextResponse.json({
      data: result.rows,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.company_id;

    const body = await req.json();

    const result = await pool.query(
      `
      INSERT INTO notes (
        company_id,
        module,
        record_id,
        note,
        created_by
      )
      VALUES (
        $1,$2,$3,$4,$5
      )
      RETURNING *
      `,
      [companyId, body.module, body.record_id, body.note, session.user.id],
    );

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 },
    );
  }
}
