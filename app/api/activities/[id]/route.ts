// app/api/activities/[id]/route.ts

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

    const result = await pool.query(
      `UPDATE activities
       SET type = $1, title = $2, description = $3, due_date = $4, status = $5, assigned_to = $6
       WHERE id = $7 AND company_id = $8
       RETURNING id`,
      [
        body.type,
        body.title,
        body.description,
        body.due_date ? new Date(body.due_date) : null,
        body.status,
        body.assigned_to,
        id,
        session.user.company_id,
      ],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        {
          error:
            "Target data record context missing or unauthorized access lock",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT Activity Mutation Interruption Error:", err);
    return NextResponse.json(
      { error: "Failed to modify activity trace profile" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const result = await pool.query(
      `DELETE FROM activities WHERE id = $1 AND company_id = $2`,
      [id, session.user.company_id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Record not found or workspace breach event blocked" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE operational failure logger:", err);
    return NextResponse.json(
      { error: "Failed to erase activity entry point record" },
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";

import { pool } from "@/lib/db";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
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

    const body = await req.json();

    const result = await pool.query(
      `
      UPDATE activities
      SET
        type = $1,
        title = $2,
        description = $3,
        due_date = $4,
        status = $5,
        assigned_to = $6
      WHERE id = $7
      RETURNING *
      `,
      [
        body.type,
        body.title,
        body.description,
        body.due_date,
        body.status,
        body.assigned_to,
        id,
      ],
    );

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Failed to update activity" },
      { status: 500 },
    );
  }
}

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
      DELETE FROM activities
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
      { error: "Failed to delete activity" },
      { status: 500 },
    );
  }
} */
