// app/api/setup/posting/accounting-periods/[id]/route.ts

import { pool } from "@/lib/db";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.company_id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await context.params;
    const { is_closed } = await req.json();

    if (typeof is_closed !== "boolean") {
      return NextResponse.json(
        { error: "Invalid status parameters specified" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `UPDATE accounting_periods 
       SET is_closed = $1 
       WHERE id = $2 AND company_id = $3`,
      [is_closed, id, session.user.company_id],
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: "Target posting period record not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Accounting Period Entry Mutation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
