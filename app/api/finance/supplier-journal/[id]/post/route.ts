// /app/api/finance/supplier-journal/[id]/post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Lock and finalize draft vouchers
    await pool.query(
      `
      UPDATE journal_entries
      SET is_posted = true, posted_at = now()
      WHERE id = $1 AND company_id = $2 AND is_posted = false
      `,
      [id, companyId],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Post Action Execution Error:", err);
    return NextResponse.json(
      { error: "Failed to finalize ledger post transaction item" },
      { status: 500 },
    );
  }
}
