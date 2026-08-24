// app/api/debit-notes/[id]/stage/route.ts

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getCompanyId } from "@/lib/auth/getCompanyId";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const companyId = await getCompanyId();
    const { id } = await params;
    const { stage_id } = await req.json();

    if (!companyId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    if (!stage_id) {
      return NextResponse.json({ success: false, error: "Stage ID is required" }, { status: 400 });
    }

    await pool.query(
      `UPDATE debit_notes 
       SET stage_id = $1, updated_at = NOW() 
       WHERE id = $2 AND company_id = $3`,
      [stage_id, id, companyId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Stage update error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to update order stage" },
      { status: 500 }
    );
  }
}