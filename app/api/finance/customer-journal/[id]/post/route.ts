// /app/api/finance/customer-journal/[id]/post/route.ts

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
    console.error(err);
    return NextResponse.json(
      { error: "Failed to post ledger item" },
      { status: 500 },
    );
  }
}
