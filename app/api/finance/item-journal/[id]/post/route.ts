// /app/api/finance/item-journal/[id]/post/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";
import { validateLedgerPostingDate } from "@/lib/validations/postingGate";
import { ItemJournalService } from "@/lib/services/item-journal.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // 1. Fetch document properties safely
    const check = await pool.query(
      `SELECT entry_date, is_posted FROM journal_entries WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (check.rows.length === 0) {
      return NextResponse.json(
        { error: "Adjustment record not found" },
        { status: 404 },
      );
    }

    const { entry_date, is_posted } = check.rows[0];
    if (is_posted) {
      return NextResponse.json(
        { error: "Transaction has already been finalized" },
        { status: 400 },
      );
    }

    // 2. Validate historical ledger locking limits 🛡️
    const formattedDate =
      entry_date instanceof Date
        ? entry_date.toISOString().split("T")[0]
        : String(entry_date);

    const gateCheck = await validateLedgerPostingDate(companyId, formattedDate);
    if (!gateCheck.allowed) {
      return NextResponse.json({ error: gateCheck.reason }, { status: 400 });
    }

    // 3. Commit posting record lock flags via ItemJournalService
    // This flips both G/L and Sub-ledger states simultaneously
    const result = await ItemJournalService.post(companyId, id);

    return NextResponse.json(result);
  } catch (err) {
    console.error("Item Journal Posting Exception:", err);
    return NextResponse.json(
      { error: "Failed to commit ledger adjustments balances" },
      { status: 500 },
    );
  }
}

/* import { NextRequest, NextResponse } from "next/server";
import { getCompanyId } from "@/lib/auth/getCompanyId";
import { pool } from "@/lib/db";
import { validateLedgerPostingDate } from "@/lib/validations/postingGate";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const companyId = await getCompanyId();
    if (!companyId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // 1. Fetch document properties safely
    const check = await pool.query(
      `SELECT entry_date, is_posted FROM journal_entries WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (check.rows.length === 0) {
      return NextResponse.json(
        { error: "Adjustment record not found" },
        { status: 404 },
      );
    }

    const { entry_date, is_posted } = check.rows[0];
    if (is_posted) {
      return NextResponse.json(
        { error: "Transaction has already been finalized" },
        { status: 400 },
      );
    }

    // 2. Validate historical ledger locking limits 🛡️
    const formattedDate =
      entry_date instanceof Date
        ? entry_date.toISOString().split("T")[0]
        : String(entry_date);

    const gateCheck = await validateLedgerPostingDate(companyId, formattedDate);
    if (!gateCheck.allowed) {
      return NextResponse.json({ error: gateCheck.reason }, { status: 400 });
    }

    // 3. Commit posting record lock flags
    await pool.query(
      `
      UPDATE journal_entries
      SET is_posted = true, posted_at = now(), updated_at = now()
      WHERE id = $1 AND company_id = $2
      `,
      [id, companyId],
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Item Journal Posting Exception:", err);
    return NextResponse.json(
      { error: "Failed to commit ledger adjustments balances" },
      { status: 500 },
    );
  }
} */
