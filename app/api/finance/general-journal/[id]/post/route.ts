// /app/api/finance/general-journal/[id]/post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";
import { validateLedgerPostingDate } from "@/lib/validations/postingGate";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Authenticate and enforce company-level isolation
    const companyId = await getCompanyId();
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // 2. Fetch the target entry_date first to pass into our gatekeeper validator
    const journalCheck = await pool.query(
      `
      SELECT entry_date, is_posted 
      FROM journal_entries 
      WHERE id = $1 AND company_id = $2
      `,
      [id, companyId],
    );

    if (journalCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Journal entry not found." },
        { status: 404 },
      );
    }

    const { entry_date, is_posted } = journalCheck.rows[0];

    // Early exit if the record has already been locked and posted
    if (is_posted) {
      return NextResponse.json(
        { error: "This journal entry has already been posted to the ledgers." },
        { status: 400 },
      );
    }

    // 3. Run the target accounting period restriction date check 🛡️
    // Format entry_date to string (YYYY-MM-DD) just in case it returns as a full Date object
    const formattedDate =
      entry_date instanceof Date
        ? entry_date.toISOString().split("T")[0]
        : String(entry_date);

    const gateCheck = await validateLedgerPostingDate(companyId, formattedDate);

    if (!gateCheck.allowed) {
      return NextResponse.json({ error: gateCheck.reason }, { status: 400 });
    }

    // 4. Proceed with final posting execution now that the gatekeeper has cleared it
    await pool.query(
      `
      UPDATE journal_entries
      SET 
        is_posted = true, 
        posted_at = now(),
        updated_at = now()
      WHERE id = $1 
        AND company_id = $2
      `,
      [id, companyId],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    const dbError = err as { code?: string; message?: string };
    console.error("General Journal Posting Engine Error:", err);
    return NextResponse.json(
      {
        error:
          dbError.message || "Failed to finalize ledger post transaction item.",
      },
      { status: 500 },
    );
  }
}
