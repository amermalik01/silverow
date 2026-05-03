// app/api/activities/route.ts

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
      FROM activities
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
      { error: "Failed to fetch activities" },
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
      INSERT INTO activities (
        company_id,
        module,
        record_id,
        type,
        title,
        description,
        due_date,
        status,
        assigned_to,
        created_by
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
      )
      RETURNING *
      `,
      [
        companyId,
        body.module,
        body.record_id,
        body.type || "task",
        body.title || null,
        body.description || null,
        body.due_date || null,
        body.status || "pending",
        body.assigned_to || null,
        session.user.id,
      ],
    );

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to create activity" },
      { status: 500 },
    );
  }
}
